"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CrisisLayer from "@/components/CrisisLayer";
import KeepCard from "@/components/KeepCard";
import PathBoard from "@/components/PathBoard";
import Shell from "@/components/Shell";
import SoftPause from "@/components/SoftPause";
import { Btn, Card, HelpFooter, Overline, t } from "@/components/ui";
import { detectCrisis } from "@/lib/crisis";
import {
  BLANK_MAX,
  BLANK_PLACEHOLDER,
  COPY,
  DAYS,
  KEEPS,
  WINDS,
  drawSome,
  readCapsule,
  saveRun,
  tearCapsule,
  writeCapsule,
} from "@/lib/lifepath";
import type { Capsule, DayCard, Keep } from "@/lib/types";
import { CAPSULE_TILE, PATH_TILES, ROUNDS, SLOT_MAX, WIND_AFTER } from "@/lib/types";

type Phase = "intro" | "pick" | "play" | "review";

function PathGame() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");

  // ---- pick ----
  const [picked, setPicked] = useState<string[]>([]);
  const [customs, setCustoms] = useState<Keep[]>([]);
  const [blankDraft, setBlankDraft] = useState("");
  const [blankOpen, setBlankOpen] = useState(false);

  // ---- play ----
  const [deck, setDeck] = useState<DayCard[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [kept, setKept] = useState<Keep[]>([]);
  const [roadside, setRoadside] = useState<Keep[]>([]);
  const [pos, setPos] = useState(0);
  const [shieldedId, setShieldedId] = useState<string | undefined>();
  const [pendingDrop, setPendingDrop] = useState(false);
  const [pendingDropKeep, setPendingDropKeep] = useState<Keep | null>(null);
  const [pendingWind, setPendingWind] = useState<string | null>(null);
  const [pendingCapsule, setPendingCapsule] = useState(false);
  const [capsuleView, setCapsuleView] = useState<Capsule | null>(null);
  const [capsuleShown, setCapsuleShown] = useState(false);
  const [round, setRound] = useState(1);
  const [startedAt, setStartedAt] = useState(0);
  const [pendingFinish, setPendingFinish] = useState(false);

  // ---- review ----
  const [reviewStep, setReviewStep] = useState(0);
  const [capsuleResult, setCapsuleResult] = useState<"saved" | "held" | "crisis" | "empty" | null>(null);
  const [chosenRoad, setChosenRoad] = useState<Keep | null>(null);
  const [noteText, setNoteText] = useState("");

  // ---- overlays ----
  const [crisis, setCrisis] = useState(false);
  const [pause, setPause] = useState(false);

  const totalPicked = picked.length + customs.length;

  // 让 finishGame 读到的永远是「最新落定」的局内状态（风/放下后的 kept、roadside）
  const runRef = useRef<{ kept: Keep[]; roadside: Keep[]; shieldedId?: string }>({
    kept: [],
    roadside: [],
    shieldedId: undefined,
  });
  useEffect(() => {
    runRef.current = { kept, roadside, shieldedId };
  }, [kept, roadside, shieldedId]);

  useEffect(() => {
    if (pendingFinish) {
      setPendingFinish(false);
      finishGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFinish]);

  // =========================================================================
  // 流程推进
  // =========================================================================
  function startPlay() {
    const initial: Keep[] = [
      ...KEEPS.filter((k) => picked.includes(k.id)),
      ...customs,
    ];
    setKept(initial);
    setRoadside([]);
    setDeck(drawSome(DAYS, ROUNDS));
    setDayIdx(0);
    setRound(1);
    setPos(0);
    setShieldedId(undefined);
    setCapsuleShown(false);
    setStartedAt(Date.now());
    setPhase("play");
  }

  function finishStep(steps: number) {
    const nextPos = Math.min(pos + steps, PATH_TILES - 1);
    setPos(nextPos);
    if (nextPos >= CAPSULE_TILE && !capsuleShown) {
      const cap = readCapsule();
      if (cap) {
        setCapsuleView(cap);
        setPendingCapsule(true);
        return;
      }
    }
    afterStep();
  }

  function afterStep() {
    if (WIND_AFTER.includes(round)) {
      setPendingWind(drawSome(WINDS, 1)[0]);
    } else {
      advanceRound();
    }
  }

  function advanceRound() {
    if (dayIdx + 1 >= ROUNDS) {
      setPendingFinish(true);
    } else {
      setDayIdx(dayIdx + 1);
      setRound(round + 1);
    }
  }

  function dismissCapsule() {
    setCapsuleShown(true);
    setPendingCapsule(false);
    afterStep();
  }

  function finishGame() {
    const snap = runRef.current;
    saveRun({
      startedAt,
      finishedAt: Date.now(),
      kept: snap.kept,
      roadside: snap.roadside,
      shieldedId: snap.shieldedId,
    });
    setPhase("review");
    setReviewStep(0);
  }

  // =========================================================================
  // 回合内动作
  // =========================================================================
  const current = deck[dayIdx];

  function takeIt() {
    if (!current) return;
    const g: Keep = { id: `g-${current.id}-${Date.now()}`, text: current.gain, group: "感觉" };
    if (kept.length < SLOT_MAX) {
      setKept((k) => [...k, g]);
      finishStep(current.steps);
    } else {
      setPendingDropKeep(g);
      setPendingDrop(true);
    }
  }

  function letPass() {
    if (!current) return;
    finishStep(current.steps);
  }

  function doDrop(dropId: string) {
    const dropped = kept.find((k) => k.id === dropId);
    if (!dropped) return;
    setRoadside((r) => [...r, dropped]);
    // 主动放下：pendingDropKeep 为空，只移走、不收新卡、不推进回合
    const incoming = pendingDropKeep;
    setKept((k) => k.filter((x) => x.id !== dropId));
    setPendingDrop(false);
    setPendingDropKeep(null);
    if (incoming) {
      setKept((k) => [...k, incoming]);
      if (current) finishStep(current.steps);
    }
  }

  // 主动把一张「在意」放到路边（与塞满时被动触发共用 pendingDrop 流程，但 pendingDropKeep 为空）
  function startVoluntaryDrop() {
    if (kept.length === 0 || pendingWind) return;
    setPendingDropKeep(null);
    setPendingDrop(true);
  }

  function cancelDrop() {
    setPendingDrop(false);
    setPendingDropKeep(null);
  }

  // =========================================================================
  // 风
  // =========================================================================
  function blowRandom(pool: Keep[]) {
    if (pool.length === 0) {
      setPendingWind(null);
      advanceRound();
      return;
    }
    const taken = pool[Math.floor(Math.random() * pool.length)];
    setRoadside((r) => [...r, taken]);
    setKept((k) => k.filter((x) => x.id !== taken.id));
    setPendingWind(null);
    advanceRound();
  }

  function shieldPick(id: string) {
    setShieldedId(id);
    blowRandom(kept.filter((k) => k.id !== id));
  }

  function letGoWind() {
    blowRandom(kept);
  }

  // =========================================================================
  // pick 阶段：空白卡 + 危机词门
  // =========================================================================
  function togglePick(id: string) {
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < SLOT_MAX ? [...p, id] : p
    );
  }

  function addBlank() {
    const text = blankDraft.trim();
    if (!text) return;
    // 双危机输入点之一：空白处自填也过门，L3 弹层（L1/L2 健康产出，放行）
    if (detectCrisis(text) >= 3) {
      setCrisis(true);
      return;
    }
    if (customs.length >= BLANK_MAX) return;
    if (totalPicked >= SLOT_MAX) return;
    setCustoms((c) => [...c, { id: `c-${Date.now()}`, text, custom: true }]);
    setBlankDraft("");
    setBlankOpen(false);
  }

  function removeCustom(id: string) {
    setCustoms((c) => c.filter((x) => x.id !== id));
  }

  // =========================================================================
  // review 阶段：时间胶囊写入（双输入点之二）
  // =========================================================================
  function writeNote() {
    if (!chosenRoad) return;
    const body = noteText.trim();
    if (!body) return;
    // L3 → 弹 CrisisLayer，胶囊不存，不叠加软文案；后续由用户决定重试或跳过
    if (detectCrisis(body) >= 3) {
      setCrisis(true);
      return;
    }
    const r = writeCapsule(chosenRoad.id, chosenRoad.text, body);
    setCapsuleResult(r);
  }

  const stepLabel = (s: number) => (s === 3 ? "今天过得快一些" : s === 1 ? "今天有点难熬" : "今天平平常常");

  const TopBar = (
    <div className="flex items-center justify-between" style={{ marginBottom: "var(--gap-section)" }}>
      <div>
        <Overline>《这一年的路》</Overline>
        <div style={{ ...t.h2, color: "var(--forest-900)", marginTop: 2 }}>{COPY.title}</div>
      </div>
      {(phase === "play" || phase === "review") && (
        <Btn variant="ghost" size="sm" onClick={() => setPause(true)}>
          {COPY.pause}
        </Btn>
      )}
    </div>
  );

  // =========================================================================
  // 各阶段画面
  // =========================================================================
  let screen: React.ReactNode = null;

  if (phase === "intro") {
    screen = (
      <Shell>
        {TopBar}
        <Card style={{ borderRadius: "var(--r-xl)" }}>
          <Overline>开始之前</Overline>
          <h1 className="content-serif" style={{ ...t.h2, color: "var(--forest-900)", margin: "var(--sp-3) 0" }}>
            {COPY.introTitle}
          </h1>
          <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", whiteSpace: "pre-line", lineHeight: 1.9 }}>
            {COPY.introBody}
          </p>
          <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-4)" }}>{COPY.introNote}</p>
        </Card>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--gap-section)" }}>
          <Btn size="lg" full onClick={() => setPhase("pick")}>{COPY.introGo}</Btn>
          <Btn variant="ghost" size="lg" full onClick={() => router.push("/")}>{COPY.introLater}</Btn>
        </div>
      </Shell>
    );
  } else if (phase === "pick") {
    screen = (
      <Shell>
        {TopBar}
        <h2 className="content-serif" style={{ ...t.h3, color: "var(--forest-900)", marginBottom: "var(--sp-3)" }}>
          {COPY.pickTitle}
        </h2>
        <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--gap-section)" }}>
          {COPY.pickHint}（已选 {totalPicked}/{SLOT_MAX}）
        </p>

        <div className="flex flex-wrap justify-center" style={{ gap: "var(--sp-3)", marginBottom: "var(--gap-section)" }}>
          {KEEPS.map((k) => (
            <KeepCard key={k.id} keep={k} size="sm" mode="select" selected={picked.includes(k.id)} onClick={() => togglePick(k.id)} />
          ))}
        </div>

        {customs.length > 0 && (
          <div className="flex flex-wrap justify-center" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
            {customs.map((c) => (
              <div key={c.id} style={{ position: "relative" }}>
                <KeepCard keep={c} size="sm" />
                <button
                  onClick={() => removeCustom(c.id)}
                  aria-label="移除这张空白卡"
                  style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 999, background: "var(--bg-elevated)", border: "1px solid var(--hairline)", color: "var(--text-tertiary)", fontSize: 13, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {blankOpen ? (
          <Card style={{ marginBottom: "var(--sp-4)" }}>
            <textarea
              value={blankDraft}
              onChange={(e) => setBlankDraft(e.target.value)}
              placeholder={BLANK_PLACEHOLDER}
              rows={2}
              className="content-serif"
              style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}
            />
            <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-3)" }}>
              <Btn size="sm" onClick={addBlank} disabled={!blankDraft.trim() || customs.length >= BLANK_MAX || totalPicked >= SLOT_MAX}>加上这张</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setBlankOpen(false); setBlankDraft(""); }}>算了</Btn>
            </div>
          </Card>
        ) : (
          <div className="text-center" style={{ marginBottom: "var(--gap-section)" }}>
            <button
              onClick={() => setBlankOpen(true)}
              disabled={customs.length >= BLANK_MAX || totalPicked >= SLOT_MAX}
              style={{
                ...t.caption,
                color: totalPicked >= SLOT_MAX ? "var(--text-disabled)" : "var(--forest-700)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                cursor: totalPicked >= SLOT_MAX ? "default" : "pointer",
              }}
            >
              ＋ 写一张不在列表里的（最多 {BLANK_MAX} 张）
            </button>
          </div>
        )}

        <Btn size="lg" full disabled={totalPicked < 1 || totalPicked > SLOT_MAX} onClick={startPlay}>
          {COPY.pickDone}
        </Btn>
      </Shell>
    );
  } else if (phase === "play") {
    const capsuleAt = capsuleView && !capsuleShown ? CAPSULE_TILE : undefined;
    screen = (
      <Shell>
        {TopBar}
        <div style={{ marginBottom: "var(--sp-5)" }}>
          <PathBoard
            pos={pos}
            capsuleAt={capsuleAt}
            onCapsule={() => { if (capsuleView) setPendingCapsule(true); }}
          />
        </div>

        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-4)" }}>
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>第 {round} / {ROUNDS} 回合</span>
          <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>{stepLabel(current?.steps ?? 2)}</span>
        </div>

        {pendingWind ? (
          <Card style={{ marginBottom: "var(--gap-card-stack)", borderRadius: "var(--r-xl)" }}>
            <Overline>{COPY.windTitle}</Overline>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9, margin: "var(--sp-3) 0" }}>
              {pendingWind}
            </p>
            {kept.length === 0 ? (
              <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-4)" }}>
                怀里现在空空的，风什么也没带走。
              </p>
            ) : shieldedId ? (
              <p style={{ ...t.caption, color: "var(--text-tertiary)", marginBottom: "var(--sp-4)" }}>{COPY.windShieldUsed}</p>
            ) : (
              <p style={{ ...t.caption, color: "var(--wood-700)", marginBottom: "var(--sp-4)" }}>{COPY.windShieldHint}</p>
            )}

            {kept.length > 0 && !shieldedId && (
              <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
                {kept.map((k) => (
                  <KeepCard key={k.id} keep={k} size="sm" mode="select" onClick={() => shieldPick(k.id)} />
                ))}
              </div>
            )}

            <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
              {kept.length > 0 && (
                <Btn size="lg" full variant="ghost" onClick={letGoWind}>{COPY.windLetGo}</Btn>
              )}
              {kept.length === 0 && (
                <Btn size="lg" full onClick={() => blowRandom([])}>继续走</Btn>
              )}
            </div>
          </Card>
        ) : pendingDrop ? (
          <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
            <Overline>{pendingDropKeep ? COPY.dropHint : "从随身格里选一张，把它放到路边（只是想放下，不收新的）"}</Overline>
            <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
              {kept.map((k) => (
                <KeepCard key={k.id} keep={k} size="sm" mode="select" onClick={() => doDrop(k.id)} />
              ))}
            </div>
            <div className="flex" style={{ gap: "var(--gap-inline)", marginTop: "var(--sp-4)" }}>
              <Btn variant="ghost" size="sm" onClick={cancelDrop}>{COPY.dropCancel}</Btn>
            </div>
          </Card>
        ) : (
          <Card style={{ marginBottom: "var(--gap-card-stack)", borderRadius: "var(--r-xl)" }}>
            <Overline>今天</Overline>
            <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9, margin: "var(--sp-3) 0" }}>
              {current?.scene}
            </p>
            <div style={{ borderTop: "1px solid var(--divider)", margin: "var(--sp-3) 0", paddingTop: "var(--sp-3)" }}>
              <div style={{ ...t.caption, color: "var(--wood-700)" }}>今天怀里多了一样东西</div>
              <p className="content-serif" style={{ ...t.body, color: "var(--text-primary)", marginTop: 4 }}>{current?.gain}</p>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
              <Btn size="lg" full onClick={takeIt}>{COPY.takeIt}</Btn>
              <Btn variant="ghost" size="lg" full onClick={letPass}>{COPY.letPass}</Btn>
            </div>
          </Card>
        )}

        <Overline>{COPY.slotsLabel}（{kept.length}/{SLOT_MAX}）</Overline>
        <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
          {kept.length === 0 && <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>还空着</span>}
          {kept.map((k) => (
            <KeepCard key={k.id} keep={k} size="sm" mode="flip" />
          ))}
        </div>
        {kept.length > 0 && !pendingWind && !pendingDrop && (
          <div className="text-center" style={{ marginBottom: "var(--sp-5)" }}>
            <button
              type="button"
              onClick={startVoluntaryDrop}
              style={{ ...t.caption, color: "var(--forest-700)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", background: "transparent", border: "none" }}
            >
              把一张轻轻放到路边 →
            </button>
          </div>
        )}

        {roadside.length > 0 && (
          <>
            <Overline>{COPY.roadsideLabel}</Overline>
            <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
              {roadside.map((k, i) => (
                <KeepCard key={`${k.id}-${i}`} keep={k} size="sm" mode="flip" />
              ))}
            </div>
          </>
        )}

        <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-5)" }}>{COPY.footer}</p>
      </Shell>
    );
  } else if (phase === "review") {
    screen = (
      <Shell>
        {TopBar}
        {reviewStep === 0 && (
          <div className="fade-up">
            <h1 className="content-serif" style={{ ...t.h2, color: "var(--forest-900)", marginBottom: "var(--sp-5)" }}>{COPY.endScreen1}</h1>
            <div className="flex flex-col" style={{ gap: "var(--gap-card-stack)" }}>
              <Card>
                <Overline>{COPY.endKeptLabel}</Overline>
                <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
                  {kept.length === 0 && <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>都放下了</span>}
                  {kept.map((k) => <KeepCard key={k.id} keep={k} size="sm" mode="flip" />)}
                </div>
              </Card>
              <Card>
                <Overline>{COPY.endRoadsideLabel}</Overline>
                <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-3)" }}>
                  {roadside.length === 0 && <span style={{ ...t.caption, color: "var(--text-tertiary)" }}>一路都很轻</span>}
                  {roadside.map((k, i) => <KeepCard key={`${k.id}-${i}`} keep={k} size="sm" mode="flip" />)}
                </div>
              </Card>
              <Card style={{ background: "var(--bg-tint)", border: "none" }}>
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9 }}>{COPY.endEyeline}</p>
              </Card>
            </div>
            <div style={{ marginTop: "var(--gap-section)" }}>
              <Btn size="lg" full onClick={() => setReviewStep(1)}>继续</Btn>
            </div>
          </div>
        )}

        {reviewStep === 1 && (
          <div className="fade-up">
            <Overline>{COPY.endNotePrompt}</Overline>
            <h2 className="content-serif" style={{ ...t.h3, color: "var(--forest-900)", margin: "var(--sp-3) 0 var(--sp-5)" }}>
              {roadside.length === 0 ? "路边是空的。那就对自己说一句吧。" : "从路边挑一张，跟它说句话。"}
            </h2>

            {roadside.length > 0 && !chosenRoad && (
              <div className="flex flex-wrap" style={{ gap: "var(--sp-3)", marginBottom: "var(--gap-section)" }}>
                {roadside.map((k, i) => (
                  <KeepCard key={`${k.id}-${i}`} keep={k} size="sm" mode="select" onClick={() => { setChosenRoad(k); setCapsuleResult(null); }} />
                ))}
              </div>
            )}

            {chosenRoad && (
              <Card style={{ marginBottom: "var(--gap-card-stack)" }}>
                <div style={{ ...t.caption, color: "var(--wood-700)" }}>你想对「{chosenRoad.text}」说：</div>
                <textarea
                  value={noteText}
                  onChange={(e) => { setNoteText(e.target.value); setCapsuleResult(null); }}
                  placeholder={COPY.endNotePlaceholder}
                  rows={3}
                  className="content-serif"
                  style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 16, lineHeight: 1.8, color: "var(--text-primary)", marginTop: 8 }}
                />
                <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-2)" }}>{COPY.capsuleHint}</p>

                {capsuleResult === "saved" && (
                  <p style={{ ...t.body, color: "var(--forest-700)", marginTop: "var(--sp-3)" }}>已经替你留好了。下次走到第 7 格，会再遇到它。</p>
                )}
                {capsuleResult === "held" && (
                  <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: "var(--sp-3)" }}>{COPY.capsuleHeld}</p>
                )}

                <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
                  <Btn size="lg" full onClick={writeNote} disabled={!noteText.trim()}>{COPY.endNoteSave}</Btn>
                  <div className="flex" style={{ gap: "var(--gap-inline)" }}>
                    <Link href="/journal/new" className="no-underline flex-1">
                      <Btn variant="secondary" size="md" full>{COPY.toJournal}</Btn>
                    </Link>
                    <Link href="/chat" className="no-underline flex-1">
                      <Btn variant="secondary" size="md" full>{COPY.toChat}</Btn>
                    </Link>
                  </div>
                  <Btn variant="ghost" size="md" full onClick={() => setReviewStep(2)}>{COPY.endNoteSkip}</Btn>
                </div>
              </Card>
            )}

            {!chosenRoad && roadside.length === 0 && (
              <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
                <Card style={{ marginBottom: "var(--sp-4)" }}>
                  <textarea
                    value={noteText}
                    onChange={(e) => { setNoteText(e.target.value); setCapsuleResult(null); }}
                    placeholder={COPY.endNotePlaceholder}
                    rows={3}
                    className="content-serif"
                    style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 16, lineHeight: 1.8, color: "var(--text-primary)" }}
                  />
                  <p style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-2)" }}>{COPY.capsuleHint}</p>
                  {capsuleResult === "saved" && <p style={{ ...t.body, color: "var(--forest-700)", marginTop: "var(--sp-3)" }}>已经替你留好了。</p>}
                  {capsuleResult === "held" && <p style={{ ...t.body, color: "var(--text-secondary)", marginTop: "var(--sp-3)" }}>{COPY.capsuleHeld}</p>}
                </Card>
                <Btn size="lg" full onClick={writeNote} disabled={!noteText.trim()}>{COPY.endNoteSave}</Btn>
                <Btn variant="ghost" size="md" full onClick={() => setReviewStep(2)}>{COPY.endNoteSkip}</Btn>
              </div>
            )}
          </div>
        )}

        {reviewStep === 2 && (
          <div className="fade-up">
            <Overline>{COPY.endCardTitle}</Overline>
            <Card style={{ marginTop: "var(--sp-4)", borderRadius: "var(--r-xl)" }}>
              {kept.length === 0 ? (
                <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9 }}>这一年，你其实一直带着的，是你愿意回头看的这份心意。</p>
              ) : (
                <div className="flex flex-col" style={{ gap: "var(--sp-4)" }}>
                  {kept.map((k) => (
                    <p key={k.id} className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9, margin: 0 }}>· {k.text}</p>
                  ))}
                </div>
              )}
            </Card>
            <div style={{ marginTop: "var(--gap-section)" }}>
              <Btn size="lg" full onClick={() => setReviewStep(3)}>继续</Btn>
            </div>
          </div>
        )}

        {reviewStep === 3 && (
          <div className="fade-up">
            <Card style={{ borderRadius: "var(--r-xl)", marginBottom: "var(--gap-card-stack)" }}>
              <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9 }}>
                走完这一年，没有分数，也没有对错。你只是回头看了一眼。
              </p>
            </Card>
            <div className="flex flex-col" style={{ gap: "var(--sp-3)" }}>
              <Link href="/journal/new" className="no-underline">
                <Btn variant="secondary" size="lg" full>{COPY.toJournal}</Btn>
              </Link>
              <Link href="/chat" className="no-underline">
                <Btn variant="secondary" size="lg" full>{COPY.toChat}</Btn>
              </Link>
              <Link href="/" className="no-underline">
                <Btn variant="ghost" size="lg" full>{COPY.toHome}</Btn>
              </Link>
            </div>
            <p className="text-center" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-5)" }}>{COPY.footer}</p>
            <HelpFooter />
          </div>
        )}
      </Shell>
    );
  }

  // =========================================================================
  // 叠层（任意阶段都可能触发）
  // =========================================================================
  const capsuleOverlay = pendingCapsule && capsuleView && (
    <div className="fixed inset-0 flex items-center justify-center fade-up" style={{ zIndex: 55, background: "var(--bg-scrim)", padding: "var(--gap-page-x)" }}>
      <Card style={{ maxWidth: 420, width: "100%", borderRadius: "var(--r-xl)" }}>
        <Overline>{COPY.capsuleFound}</Overline>
        <p className="content-serif" style={{ ...t.caption, color: "var(--text-tertiary)", marginTop: "var(--sp-3)" }}>
          {COPY.capsuleLead.replace("{keep}", capsuleView.keepText)}
        </p>
        <p className="content-serif" style={{ ...t.bodyLg, color: "var(--text-primary)", lineHeight: 1.9, margin: "var(--sp-3) 0" }}>
          {capsuleView.text}
        </p>
        <p style={{ ...t.caption, color: "var(--text-tertiary)" }}>{COPY.capsulePrivate}</p>
        <div className="flex flex-col" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-5)" }}>
          <Btn size="lg" full onClick={dismissCapsule}>{COPY.capsuleGo}</Btn>
          <Btn variant="secondary" size="lg" full onClick={() => { tearCapsule(); dismissCapsule(); }}>{COPY.capsuleTear}</Btn>
          <Link href="/chat" className="no-underline">
            <Btn variant="ghost" size="lg" full>{COPY.capsuleChat}</Btn>
          </Link>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      {screen}
      {capsuleOverlay}
      {pause && (
        <SoftPause
          onBack={() => setPause(false)}
          onLeave={() => router.push("/")}
          onChat={() => router.push("/chat")}
        />
      )}
      {crisis && (
        <CrisisLayer
          variant="journal"
          onClose={() => setCrisis(false)}
          onContinue={() => setCrisis(false)}
        />
      )}
    </>
  );
}

export default function Page() {
  return <PathGame />;
}

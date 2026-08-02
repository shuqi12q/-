/* ============================================================
   心屿 XinYu — 应用逻辑
   ============================================================ */

/* ---------------- 工具 ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const mm = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = t => String(t == null ? '' : t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function toast(t) {
  const el = $('#toast'); el.textContent = t; el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2200);
}
function openSheet(html) { $('#sheet-body').innerHTML = html; $('#sheet').classList.add('on'); }
function closeSheet() { $('#sheet').classList.remove('on'); }

function faceSVG(v, color, s = 26) {
  const m = { 5: 'M7.6 15.4c1.8 2.8 7 2.8 8.8 0', 4: 'M8.2 15c1.6 2 6 2 7.6 0', 3: 'M8.4 15.8h7.2', 2: 'M8.2 16.8c1.6-2 6-2 7.6 0', 1: 'M7.6 17.4c1.8-2.8 7-2.8 8.8 0' }[v];
  const eyes = v === 5
    ? `<path d="M6.9 10.4c.8-1.2 2.2-1.2 3 0M14.1 10.4c.8-1.2 2.2-1.2 3 0" stroke="${color}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`
    : `<circle cx="8.5" cy="10.3" r="1.3" fill="${color}"/><circle cx="15.5" cy="10.3" r="1.3" fill="${color}"/>`;
  const tear = v === 1 ? `<path d="M16.4 12.6c0 0-1.1 1.6-1.1 2.3a1.1 1.1 0 0 0 2.2 0c0-.7-1.1-2.3-1.1-2.3z" fill="${color}" opacity=".5"/>` : '';
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none">${eyes}<path d="${m}" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>${tear}</svg>`;
}

/* ---------------- 本地存储 ---------------- */
const KEY = 'xinyu_v1';
let DB = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.moods) return d;
  } catch (e) {}
  return seed();
}
function save() { localStorage.setItem(KEY, JSON.stringify(DB)); }

/* 首次打开塞一点演示数据，让图表不空 */
function seed() {
  const moods = [], now = Date.now();
  const demo = [3, 2, 4, 3, 2, 4, 5, 3, 4, 2, 3, 4];
  const tagPool = ['工作', '睡眠', '朋友', '疲惫', '焦虑', '平静', '家人', '独处'];
  for (let i = demo.length; i >= 1; i--) {
    const t = now - i * 864e5;
    moods.push({
      date: ymd(new Date(t)), v: demo[demo.length - i], ts: t,
      tags: [tagPool[i % tagPool.length], tagPool[(i + 3) % tagPool.length]],
      note: i === 3 ? '开完会有点累，但下午自己走了二十分钟，好一些。' : '',
    });
  }
  return { moods, sessions: [], tests: [], minutes: 46, first: now - 12 * 864e5 };
}

/* ---------------- 路由 ---------------- */
const TABS = ['home', 'chat', 'mood', 'breath', 'me'];
const FULL = ['player', 'quiz', 'report', 'summary'];
let cur = 'home';

function go(v) {
  if (v === cur && !FULL.includes(v)) return;
  if (cur === 'player' && v !== 'player') stopAudioAll();
  cur = v;
  $$('.view').forEach(e => e.classList.remove('on'));
  $('#' + v + '-view').classList.add('on');
  $('#tabbar').style.display = FULL.includes(v) ? 'none' : 'flex';
  $('#statusbar').style.color = v === 'player' ? 'rgba(255,255,255,.92)' : '';
  const tabFor = { summary: 'chat', quiz: 'test', report: 'test', test: 'home', player: 'breath' }[v] || v;
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tabFor));
  if (v === 'home') renderHome();
  if (v === 'mood') renderMood();
  if (v === 'test') renderTests();
  if (v === 'breath') renderBreath();
  if (v === 'me') renderMe();
  if (v === 'chat' && !chat.started) startChat();
}

/* ============================================================
   首页
   ============================================================ */
function renderHome() {
  const h = new Date().getHours();
  $('#greet').textContent = h < 6 ? '还没睡吗' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : h < 23 ? '晚上好' : '夜深了';
  const q = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];
  $('#quote').innerHTML = `<span>${q[0]}</span><span>${q[1]}</span>`;

  const st = streakDays();
  $('#streak').innerHTML = st > 0
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="#D8A94E"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1 .5-2 1-2.5.7 1.3 2 3 2 5.5a6 6 0 1 1-12 0C6 8 12 7 12 2z"/></svg> 已连续记录 ${st} 天`
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="#D8A94E"><circle cx="12" cy="12" r="9"/></svg> 今天还没记录，从一次打卡开始`;

  const today = DB.moods.find(m => m.date === ymd(new Date()));
  $('#checkin-sub').textContent = today ? `今天记录过了：${MOODS.find(x => x.v === today.v).label} · 点一下可修改` : '一秒记录，慢慢就能看见自己的规律';
  $('#faces').innerHTML = MOODS.map(m =>
    `<button class="face ${today && today.v === m.v ? 'on' : ''}" style="color:${m.color}" onclick="quickMood(${m.v})">
       <div class="fw">${faceSVG(m.v, m.color, 26)}</div><span>${m.label}</span></button>`
  ).join('');

  // 推荐
  const last = DB.moods[DB.moods.length - 1];
  const lowMood = last && last.v <= 2;
  const recs = lowMood
    ? [MEDITATIONS.find(m => m.id === 'selfcomp'), BREATH_PATTERNS[0], MEDITATIONS.find(m => m.id === 'ground')]
    : [BREATH_PATTERNS[1], MEDITATIONS.find(m => m.id === 'anchor'), MEDITATIONS.find(m => m.id === 'bodyscan')];
  $('#recs').innerHTML = recs.map(r => {
    const isB = !!r.steps;
    return `<button class="rec" onclick="${isB ? `playBreath('${r.id}')` : `playMed('${r.id}')`}">
      <div class="rc" style="background:${r.color}22">${isB ? iconWind(r.color) : iconLeaf(r.color)}</div>
      <div class="rt"><b>${r.name}</b><i>${isB ? '呼吸练习 · ' + r.rounds + ' 轮' : r.tag + ' · ' + r.dur + ' 分钟'}</i></div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4BCB4" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>
    </button>`;
  }).join('');

  $('#sounds').innerHTML = SOUNDSCAPES.map(s =>
    `<button class="sound" id="snd-${s.id}" style="background:${s.color}1A" onclick="toggleSound('${s.id}','${s.color}')">
      <div class="wave" style="background:${s.color}"></div>
      <span style="position:relative;z-index:2">${s.emoji}</span><b style="position:relative;z-index:2">${s.name}</b></button>`
  ).join('');
  SOUNDSCAPES.forEach(s => { if (audioNodes[s.id]) markSound(s.id, s.color, true); });
}
const iconWind = c => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 16h8a2.6 2.6 0 1 1-2.6 2.6M3 12h16a2.6 2.6 0 1 0-2.6-2.6"/></svg>`;
const iconLeaf = c => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C10 4 4 9 4 16c0 2 .7 3.4.7 3.4S9 12 20 11"/><path d="M4.7 19.4L3 21"/></svg>`;

function streakDays() {
  let n = 0, d = new Date();
  const set = new Set(DB.moods.map(m => m.date));
  if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
  while (set.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function quickMood(v) { openCheckin(v); }

/* ---------------- 打卡面板 ---------------- */
let pickState = { v: 3, tags: [], note: '' };
function openCheckin(v) {
  const today = DB.moods.find(m => m.date === ymd(new Date()));
  pickState = { v: v || (today ? today.v : 3), tags: today ? [...today.tags] : [], note: today ? today.note : '' };
  drawSheet();
}
function drawSheet() {
  const m = MOODS.find(x => x.v === pickState.v);
  openSheet(`
    <div style="text-align:center;margin-bottom:4px">
      <div class="h2">此刻的心情</div>
      <div class="tiny" style="margin-top:4px">${m.desc}</div>
    </div>
    <div class="moodpick" style="margin-top:16px">
      ${MOODS.map(x => `<button class="face ${x.v === pickState.v ? 'on' : ''}" style="color:${x.color}" onclick="pickFace(${x.v})">
        <div class="fw">${faceSVG(x.v, x.color, 26)}</div><span>${x.label}</span></button>`).join('')}
    </div>
    ${MOOD_TAGS.map(g => `<div class="taggrp"><div class="gl">${g.g}</div><div class="tags">
      ${g.items.map(t => `<button class="chip ${pickState.tags.includes(t) ? 'on' : ''}" onclick="tapTag('${t}')">${t}</button>`).join('')}
    </div></div>`).join('')}
    <div class="notebox"><textarea id="mnote" placeholder="想多写两句吗？（可以不写）">${pickState.note}</textarea></div>
    <button class="btn" style="margin-top:18px" onclick="saveMood()">记下来</button>
  `);
}
function pickFace(v) {
  const n = $('#mnote'); if (n) pickState.note = n.value;
  pickState.v = v; drawSheet();
}
function tapTag(t) {
  const n = $('#mnote'); if (n) pickState.note = n.value;
  const i = pickState.tags.indexOf(t);
  i < 0 ? pickState.tags.push(t) : pickState.tags.splice(i, 1);
  drawSheet();
}
function saveMood() {
  const n = $('#mnote'); pickState.note = n ? n.value.trim() : '';
  const d = ymd(new Date());
  const rec = { date: d, v: pickState.v, tags: pickState.tags, note: pickState.note, ts: Date.now() };
  const i = DB.moods.findIndex(m => m.date === d);
  i < 0 ? DB.moods.push(rec) : DB.moods[i] = rec;
  save(); closeSheet();
  toast(streakDays() > 1 ? `记下了 · 已连续 ${streakDays()} 天` : '记下了，谢谢你告诉我');
  renderHome(); if (cur === 'mood') renderMood();
}

/* ============================================================
   AI 对话
   ============================================================ */
let chat = { started: false, topic: null, step: -1, data: {}, awaitType: null, busy: false, freeCount: 0, crisisShown: false };

function addMsg(who, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + who; d.textContent = text;
  $('#msgs').appendChild(d); scrollChat();
  return d;
}
function addNode(html) {
  const d = document.createElement('div');
  d.className = 'inchat'; d.innerHTML = html;
  $('#msgs').appendChild(d); scrollChat();
  return d;
}
function scrollChat() { const m = $('#msgs'); setTimeout(() => m.scrollTop = m.scrollHeight, 40); }

async function botSay(text) {
  const t = document.createElement('div');
  t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>';
  $('#msgs').appendChild(t); scrollChat();
  await sleep(clamp(text.length * 32, 550, 1500));
  t.remove(); addMsg('bot', text); await sleep(200);
}

async function startChat() {
  chat = { started: true, topic: null, step: -1, data: {}, awaitType: null, busy: true, freeCount: 0, crisisShown: false };
  $('#msgs').innerHTML = '';
  const h = new Date().getHours();
  await botSay(h < 6 || h >= 23 ? '这个点还醒着，是睡不着，还是有心事？' : '嗨，我是小屿。');
  await botSay('这里说的每句话都只存在你自己的手机里。你可以慢慢说，也可以什么都不说。');
  await botSay('想从哪里开始？');
  showTopics();
  chat.busy = false;
}
function showTopics() {
  const n = addNode(`<div class="opts">${CHAT_TOPICS.map(t =>
    `<button class="opt" onclick="chooseTopic('${t.id}',this)">${t.emoji} ${t.label}</button>`).join('')}</div>`);
  n.id = 'topic-node';
}

async function chooseTopic(id, el) {
  if (chat.busy) return;
  const t = CHAT_TOPICS.find(x => x.id === id);
  $('#topic-node')?.remove();
  addMsg('me', t.label);
  chat.topic = t; chat.busy = true;
  await sleep(320);
  await botSay(t.open);
  if (id === 'free') {
    await botSay('那就随便聊。你今天过得怎么样？');
    chat.awaitType = 'free'; chat.busy = false; return;
  }
  chat.step = 0; await runStep();
}

function interp(s) {
  return s
    .replace('{intensity}', chat.data.intensity)
    .replace('{distortionTip}', (DISTORTIONS.find(d => d.id === chat.data.distortion) || {}).tip || '')
    .replace('{delta}', deltaText());
}
function deltaText() {
  const a = +chat.data.intensity, b = +chat.data.intensity2;
  if (b < a) return `从 ${a} 分到 ${b} 分。你自己把它降下来了 ${a - b} 分——这不是我做的，是你做的。`;
  if (b === a) return `还是 ${a} 分。没变化也很正常，有些情绪需要的是时间，不是道理。`;
  return `${a} 分变成了 ${b} 分。说出来的时候情绪浮上来是常见的，这说明你真的碰到了它。`;
}

async function runStep() {
  chat.busy = true;
  const st = CBT_FLOW[chat.step];
  if (!st) { chat.busy = false; return finishFlow(); }
  for (const line of st.bot) await botSay(interp(line));
  renderControl(st);
  chat.busy = false;
}

function renderControl(st) {
  $('#ctl')?.remove();
  if (st.type === 'text') {
    chat.awaitType = 'step';
    $('#input').placeholder = st.ph || '说点什么…';
    $('#input').focus();
  } else if (st.type === 'slider') {
    chat.awaitType = null;
    const n = addNode(`<div class="slider-c">
      <div class="sv" id="sv">5</div><div class="sl">0 = 完全没有　·　10 = 快撑不住了</div>
      <input type="range" min="0" max="10" value="5" oninput="document.getElementById('sv').textContent=this.value" id="srange">
      <div class="ends"><span>还好</span><span>很难受</span></div>
      <button class="btn soft" style="margin-top:14px;height:42px" onclick="answerSlider(this)">就是这个感觉</button>
    </div>`);
    n.id = 'ctl';
  } else if (st.type === 'distortion') {
    chat.awaitType = null;
    const n = addNode(`<div class="dist">${DISTORTIONS.map(d =>
      `<button onclick="answerChoice('${d.id}','${d.label}')"><b>${d.label}</b><i>${d.desc}</i></button>`).join('')}</div>`);
    n.id = 'ctl';
  } else if (st.type === 'action') {
    chat.awaitType = null;
    const n = addNode(`<div class="opts">${ACTIONS.map(a =>
      `<button class="opt" onclick="answerChoice('${a.id}','${a.label}')">${a.label}</button>`).join('')}</div>`);
    n.id = 'ctl';
  }
}
function answerSlider() {
  const v = $('#srange').value;
  $('#ctl')?.remove(); addMsg('me', v + ' 分');
  advance(v);
}
function answerChoice(id, label) {
  $('#ctl')?.remove(); addMsg('me', label);
  advance(id);
}
function advance(val) {
  chat.data[CBT_FLOW[chat.step].key] = val;
  chat.step++; chat.awaitType = null;
  $('#input').placeholder = '想说点什么…';
  runStep();
}

async function finishFlow() {
  await botSay('我们把这件事从头到尾走了一遍。你做得很好。');
  await botSay('要我把刚才聊的整理成一张卡片吗？以后想起来可以翻。');
  const n = addNode(`<div class="opts">
    <button class="opt" onclick="endSession()">好，生成总结</button>
    <button class="opt" onclick="continueFree(this)">再多说两句</button></div>`);
  n.id = 'ctl';
}
async function continueFree() {
  $('#ctl')?.remove(); addMsg('me', '再多说两句');
  chat.awaitType = 'free';
  await botSay('嗯，你说，我听着。');
}

/* ---- 发送 ---- */
function sendMsg() {
  const el = $('#input'), v = el.value.trim();
  if (!v || chat.busy) return;
  el.value = ''; el.style.height = 'auto'; $('#send').disabled = true;
  addMsg('me', v);
  if (checkCrisis(v)) return;
  if (chat.awaitType === 'step') { advance(v); return; }
  freeReply(v);
}

async function freeReply(v) {
  chat.busy = true; chat.freeCount++;
  await sleep(260);
  const low = v.toLowerCase();
  const hit = KEYWORD_REPLIES.find(k => k.k.some(w => low.includes(w)));
  const lines = hit ? hit.r : pick(FALLBACK_REPLIES);
  for (const l of lines) await botSay(l);

  if (chat.awaitType === 'free' && chat.freeCount >= 2 && chat.step < 0) {
    await botSay('如果你愿意，我们可以一起把它拆开看看——通常聊完会清楚不少。');
    const n = addNode(`<div class="opts">
      <button class="opt" onclick="startCBT(this)">好，一起看看</button>
      <button class="opt" onclick="justTalk(this)">不用，我就想说说话</button></div>`);
    n.id = 'ctl';
  } else if (chat.step >= 0 && chat.step < CBT_FLOW.length) {
    await botSay('说完了的话，我们接着刚才那步继续。');
    renderControl(CBT_FLOW[chat.step]);
  }
  chat.busy = false;
}
async function startCBT() {
  $('#ctl')?.remove(); addMsg('me', '好，一起看看');
  if (!chat.topic) chat.topic = CHAT_TOPICS.find(t => t.id === 'free');
  chat.step = 0; await runStep();
}
async function justTalk() {
  $('#ctl')?.remove(); addMsg('me', '我就想说说话');
  await botSay('完全可以。倾诉本身就有用，不一定非要解决什么。');
  chat.awaitType = 'free'; chat.freeCount = 0;
}

/* ---- 危机干预 ---- */
function checkCrisis(v) {
  if (!CRISIS_WORDS.some(w => v.includes(w))) return false;
  chat.crisisShown = true; chat.busy = true;
  setTimeout(async () => {
    await botSay('等一下。我注意到你刚才说的话了，我很在意。');
    await botSay('我只是一个程序，这个时候我给不了你真正需要的东西。但有人可以，而且现在就在。');
    addNode(`<div class="crisis">
      <div class="ch"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B4634A" stroke-width="2.2" stroke-linecap="round"><path d="M12 8.5v5M12 17h.01"/><circle cx="12" cy="12" r="9.2"/></svg><b>请先联系真实的人</b></div>
      <p>你现在的痛苦是真实的，也是可以被帮助的。请拨打下面任意一个号码，或者去最近医院的急诊。如果身边有人，也请告诉他们。</p>
      ${CRISIS_LINES.map(l => `<div class="line"><div><b>${l.name}</b><i>${l.note}</i></div><em>${l.num}</em></div>`).join('')}
    </div>`);
    await sleep(400);
    await botSay('打完电话，或者只要你还愿意，我都在这里。');
    chat.busy = false;
  }, 500);
  return true;
}

/* ---- 结束并总结 ---- */
function endSession() {
  const d = chat.data;
  if (!d.situation && !chat.freeCount) { toast('还没聊什么呢，先说两句吧'); return; }
  const s = buildSummary();
  DB.sessions.unshift(s); save();
  renderSummary(s); go('summary');
}

const EMO_LEX = {
  焦虑: ['焦虑', '慌', '紧张', '担心', '不安', '怕'],
  疲惫: ['累', '疲', '倦', '撑不'],
  低落: ['难过', '低落', '沮丧', '失落', '想哭', '崩溃'],
  愤怒: ['生气', '烦', '愤怒', '恼火'],
  孤独: ['孤独', '一个人', '没人', '孤单'],
  愧疚: ['愧疚', '对不起', '自责', '怪自己'],
  压力: ['压力', '加班', 'ddl', 'deadline', '汇报', '考核', '截止'],
  失眠: ['睡不着', '失眠', '熬夜', '早醒'],
};

function buildSummary() {
  const d = chat.data;
  const text = [d.situation, d.thought, d.evidence, d.reframe].filter(Boolean).join(' ');
  const tags = Object.keys(EMO_LEX).filter(k => EMO_LEX[k].some(w => text.includes(w)));
  if (chat.topic && tags.length < 2) {
    const map = { anxiety: '焦虑', insomnia: '失眠', low: '低落', work: '压力', relation: '人际' };
    const t = map[chat.topic.id]; if (t && !tags.includes(t)) tags.unshift(t);
  }
  if (!tags.length) tags.push('说不清的情绪');

  const dist = DISTORTIONS.find(x => x.id === d.distortion);
  const adv = adviceFor(chat.topic ? chat.topic.id : 'free', d);
  return {
    id: 'S' + Date.now(), ts: Date.now(),
    topic: chat.topic ? chat.topic.label : '自由倾诉',
    situation: d.situation || '', thought: d.thought || '',
    distortion: dist && dist.id !== 'unsure' ? dist.label : '',
    distortionTip: dist ? dist.tip : '',
    evidence: d.evidence || '', reframe: d.reframe || '',
    i1: d.intensity != null ? +d.intensity : null, i2: d.intensity2 != null ? +d.intensity2 : null,
    action: (ACTIONS.find(a => a.id === d.action) || {}).label || '',
    actionTo: (ACTIONS.find(a => a.id === d.action) || {}).to || null,
    tags, adv, crisis: chat.crisisShown,
  };
}
function adviceFor(topic, d) {
  const base = {
    anxiety: ['焦虑高峰通常 20 分钟内会回落，不需要做什么，等它过去就好。', '把"万一失败怎么办"改写成"如果真发生了，我第一步做什么"。', '睡前把待办写在纸上，大脑就不用整夜替你记着了。'],
    insomnia: ['躺 20 分钟还没睡着就起来，做点无聊的事，困了再回床上。', '固定起床时间比固定入睡时间更重要。', '白天出门晒 15 分钟太阳，褪黑素晚上才会准时上班。'],
    low: ['低落时不要做重大决定，你现在看到的世界是被滤镜过的。', '把目标降到"洗个脸""下楼一趟"，完成小事能重新启动动力。', '主动联系一个人，哪怕只发一句"在吗"。'],
    work: ['区分"必须做好"和"做完就行"，不是每件事都值得 100 分。', '每工作 90 分钟真正离开工位 5 分钟，不是刷手机。', '下班后给自己一个明确的仪式，告诉身体今天结束了。'],
    relation: ['你不需要为别人的情绪负全责。', '先照顾自己的感受，再考虑对方怎么想——顺序反了会很累。', '有些关系维持成本太高，允许自己降低投入。'],
    free: ['把感受说出来，本身就在降低它的强度。', '今天只要完成一件小事就够了。', '照顾好睡眠、进食和走动，情绪的地基是身体。'],
  }[topic] || [];
  const out = [...base];
  if (d.reframe) out.unshift(`记得你自己说的那句：「${String(d.reframe).slice(0, 40)}」`);
  return out.slice(0, 4);
}

function renderSummary(s) {
  const dt = new Date(s.ts);
  const dtxt = `${dt.getMonth() + 1} 月 ${dt.getDate()} 日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  const row = (k, v, icon) => v ? `<div class="sumrow"><div class="k">${icon || ''}${k}</div><div class="val">${v}</div></div>` : '';
  $('#summary-body').innerHTML = `
  <div class="sumcard">
    <div class="sh"><div class="sd">${dtxt}</div><b>${s.topic}</b></div>
    <div class="sumrow" style="border-top:none;padding-top:0">
      <div class="k">情绪关键词</div>
      <div class="tagline">${s.tags.map(t => `<span>${t}</span>`).join('')}</div>
    </div>
    ${s.i1 != null && s.i2 != null ? `<div class="sumrow"><div class="k">情绪强度变化</div>
      <div class="deltabar">
        <div class="dn" style="color:var(--a)">${s.i1}</div>
        <div class="arrow"></div>
        <div class="dn" style="color:var(--p-d)">${s.i2}</div>
      </div>
      <div class="tiny" style="margin-top:8px">${s.i2 < s.i1 ? `一次对话降了 ${s.i1 - s.i2} 分` : s.i2 === s.i1 ? '强度持平，情绪需要时间' : '情绪浮上来了，说明你真的碰到了它'}</div></div>` : ''}
    ${row('触发情境', esc(s.situation))}
    ${row('那句最扎人的想法', s.thought ? `「${esc(s.thought)}」` : '')}
    ${s.distortion ? `<div class="sumrow"><div class="k">可能的思维习惯</div>
      <div class="val"><b style="color:var(--a)">${s.distortion}</b><div class="tiny" style="margin-top:5px;line-height:1.7">${s.distortionTip}</div></div></div>` : ''}
    ${row('你找到的相反证据', esc(s.evidence))}
    ${row('你给自己的新说法', s.reframe ? `「${esc(s.reframe)}」` : '')}
    <div class="sumrow"><div class="k">小屿的建议</div>
      ${s.adv.map((a, i) => `<div class="advice"><i>${i + 1}</i><div>${esc(a)}</div></div>`).join('')}
    </div>
    ${s.action ? row('你打算做的一件小事', esc(s.action)) : ''}
  </div>
  <div class="pad" style="margin-top:18px">
    ${s.actionTo ? `<button class="btn" onclick="go('${s.actionTo === 'mood' ? 'mood' : s.actionTo === 'breath' ? 'breath' : 'breath'}')">现在就去做</button>` : ''}
    <button class="btn ghost" style="margin-top:10px" onclick="newSession()">开始新的一次对话</button>
    <div class="tiny" style="text-align:center;margin:16px 0 30px;line-height:1.8">总结已保存到「我的 · 倾诉档案」<br>只存在这台设备上</div>
  </div>`;
}

function newSession() { chat.started = false; go('chat'); }

/* ============================================================
   情绪日记
   ============================================================ */
function renderMood() {
  const ms = [...DB.moods].sort((a, b) => a.ts - b.ts);
  const last14 = ms.slice(-14);
  const avg = ms.length ? (ms.reduce((s, m) => s + m.v, 0) / ms.length).toFixed(1) : '—';

  // 标签统计
  const cnt = {};
  ms.forEach(m => m.tags.forEach(t => cnt[t] = (cnt[t] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);

  $('#mood-body').innerHTML = `
    <div class="chartcard">
      <div class="ch"><b>近 14 天情绪曲线</b><i>平均 ${avg} 分</i></div>
      ${lineChart(last14)}
    </div>

    <div class="chartcard" style="margin-top:12px">
      <div class="ch"><b>最近 5 周</b><i>颜色越深心情越好</i></div>
      <div class="calw">${['一', '二', '三', '四', '五', '六', '日'].map(d => `<span>${d}</span>`).join('')}</div>
      ${heatmap()}
    </div>

    ${top.length ? `<div class="chartcard" style="margin-top:12px">
      <div class="ch"><b>出现最多的因素</b><i>点击查看</i></div>
      <div class="tags">${top.map(([t, c]) => `<button class="chip" onclick="tagDetail('${t}')">${t} <b style="color:var(--p);font-weight:600">${c}</b></button>`).join('')}</div>
    </div>` : ''}

    <div class="sec-t"><b>记录</b><a>${ms.length} 条</a></div>
    <div style="padding-bottom:26px">
      ${[...ms].reverse().slice(0, 20).map(m => {
        const mo = MOODS.find(x => x.v === m.v), d = new Date(m.ts);
        return `<div class="diary">
          <div class="dd"><b>${d.getDate()}</b><i>${d.getMonth() + 1}月</i></div>
          <div class="db"><div class="dt">${faceSVG(m.v, mo.color, 19)}<b style="color:${mo.color}">${mo.label}</b>
            <span class="tiny">${m.tags.join(' · ')}</span></div>
            ${m.note ? `<p>${esc(m.note)}</p>` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function lineChart(data) {
  if (data.length < 2) return '<div class="empty"><p>再记录几天就能看到曲线了</p></div>';
  const W = 296, H = 106, pad = 10;
  const step = (W - pad * 2) / (data.length - 1);
  const y = v => H - pad - ((v - 1) / 4) * (H - pad * 2);
  const pts = data.map((d, i) => [pad + i * step, y(d.v)]);
  // 平滑曲线
  let path = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    path += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const area = path + ` L${pts[pts.length - 1][0]},${H - pad} L${pts[0][0]},${H - pad} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7FA396" stop-opacity=".28"/><stop offset="1" stop-color="#7FA396" stop-opacity="0"/></linearGradient></defs>
    ${[1, 2, 3, 4, 5].map(v => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="#F0EAE3" stroke-width="1"/>`).join('')}
    <path d="${area}" fill="url(#g1)"/>
    <path d="${path}" fill="none" stroke="#7FA396" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#fff" stroke="${MOODS.find(m => m.v === data[i].v).color}" stroke-width="2.2"/>`).join('')}
  </svg>`;
}

function heatmap() {
  const map = {}; DB.moods.forEach(m => map[m.date] = m.v);
  const cells = []; const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const start = new Date(today); start.setDate(start.getDate() - dow - 28);
  for (let i = 0; i < 35; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = ymd(d), v = map[k], fut = d > today;
    const mo = v ? MOODS.find(x => x.v === v) : null;
    cells.push(`<div style="background:${mo ? mo.color + (v >= 4 ? 'DD' : v === 3 ? '99' : '77') : (fut ? '#FAF6F1' : '#F2ECE5')};color:${mo ? '#fff' : '#C4BCB4'};opacity:${fut ? .45 : 1}" title="${k}">${d.getDate()}</div>`);
  }
  return `<div class="calh">${cells.join('')}</div>`;
}

function tagDetail(t) {
  const rel = DB.moods.filter(m => m.tags.includes(t));
  const avg = (rel.reduce((s, m) => s + m.v, 0) / rel.length).toFixed(1);
  const all = (DB.moods.reduce((s, m) => s + m.v, 0) / DB.moods.length).toFixed(1);
  const diff = (avg - all).toFixed(1);
  openSheet(`<div style="text-align:center"><div class="h2">「${t}」出现时</div>
    <div class="tiny" style="margin-top:5px">共 ${rel.length} 次记录</div></div>
    <div style="display:flex;gap:12px;margin-top:20px">
      <div class="card" style="flex:1;text-align:center"><div style="font-size:30px;font-weight:600;color:${diff < 0 ? 'var(--a)' : 'var(--p)'}">${avg}</div><div class="tiny" style="margin-top:3px">这个标签下的平均心情</div></div>
      <div class="card" style="flex:1;text-align:center"><div style="font-size:30px;font-weight:600;color:var(--t3)">${all}</div><div class="tiny" style="margin-top:3px">你的整体平均</div></div>
    </div>
    <div class="card" style="margin-top:12px;background:${diff < -0.3 ? 'var(--a-l)' : diff > 0.3 ? 'var(--p-xl)' : 'var(--surface-2)'};box-shadow:none">
      <div class="sub">${diff < -0.3 ? `有「${t}」的日子，你的心情平均低 ${Math.abs(diff)} 分。它可能是一个值得关注的消耗源。`
        : diff > 0.3 ? `有「${t}」的日子，你的心情平均高 ${diff} 分。这是你的能量来源，可以多安排一点。`
        : `「${t}」对你的心情影响不大，它更像是一个中性的背景。`}</div>
    </div>
    <button class="btn ghost" style="margin-top:18px" onclick="closeSheet()">知道了</button>`);
}

/* ============================================================
   量表测评
   ============================================================ */
function renderTests() {
  const list = Object.values(SCALES);
  $('#test-body').innerHTML = `
    <div class="sub" style="padding:0 2px 16px">以下量表均为国际通用的自评工具，用于帮助你了解自己近期的状态。<b style="color:var(--t)">结果不构成诊断</b>，只有面对面的专业评估才能。</div>
    ${list.map(s => {
      const last = DB.tests.filter(t => t.id === s.id).sort((a, b) => b.ts - a.ts)[0];
      return `<button class="scalecard" onclick="startQuiz('${s.id}')">
        <div class="sc" style="background:${s.color}">${s.short}</div>
        <div class="st"><b>${s.name}</b><i>${s.n} 题 · ${s.time}</i></div>
        <div class="sr">${last ? `<b>${last.score}</b>${last.label}` : '<span style="color:var(--p)">未测</span>'}</div>
      </button>`;
    }).join('')}
    ${DB.tests.length ? `<div class="sec-t"><b>历史记录</b></div>
      <div style="padding-bottom:26px">${DB.tests.slice().sort((a, b) => b.ts - a.ts).slice(0, 8).map(t => {
        const s = SCALES[t.id], d = new Date(t.ts);
        return `<div class="listitem"><div class="li" style="background:${s.color}22;color:${s.color};font-size:11px;font-weight:700">${s.short}</div>
          <div class="lt"><b>${s.name}</b><i>${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</i></div>
          <div style="text-align:right"><b style="font-size:17px">${t.score}</b><div class="tiny">${t.label}</div></div></div>`;
      }).join('')}</div>` : ''}
    <div class="disclaimer" style="margin:20px 0 30px">量表版权归原作者所有，此处为教育与自助用途的中文改编。若得分较高，请前往正规医疗机构的精神心理科就诊。</div>`;
}

let quiz = null;
function startQuiz(id) {
  quiz = { s: SCALES[id], i: 0, ans: [] };
  go('quiz'); drawQuiz();
}
function drawQuiz() {
  const { s, i } = quiz;
  $('#quiz-name').textContent = s.short + '测评';
  $('#quiz-cnt').textContent = `${i + 1} / ${s.n}`;
  $('#quiz-prog').style.width = ((i) / s.n * 100) + '%';
  $('#quiz-intro').textContent = i === 0 ? s.intro : '';
  $('#quiz-q').textContent = s.q[i];
  const opts = s.optionsPer ? s.optionsPer[i] : s.options;
  $('#quiz-opts').innerHTML = opts.map((o, k) =>
    `<button class="qopt ${quiz.ans[i] === k ? 'on' : ''}" onclick="answerQuiz(${k})">${o}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" style="opacity:${quiz.ans[i] === k ? 1 : .16}"><path d="M4 12.5l5.2 5L20 6.5"/></svg></button>`).join('');
}
function answerQuiz(k) {
  if (!quiz || quiz.lock) return;          // 防连点 / 防答完后残留回调
  quiz.ans[quiz.i] = k;
  quiz.lock = true;
  drawQuiz();
  setTimeout(() => {
    if (!quiz) return;
    quiz.lock = false;
    if (quiz.i < quiz.s.n - 1) { quiz.i++; drawQuiz(); }
    else finishQuiz();
  }, 230);
}
function quitQuiz() {
  if (quiz && quiz.ans.filter(x => x != null).length > 0) {
    openSheet(`<div style="text-align:center;padding:6px 0"><div class="h2">要放弃这次测评吗？</div>
      <div class="sub" style="margin-top:8px">已经答了 ${quiz.ans.filter(x => x != null).length} 题，退出后不会保存。</div></div>
      <button class="btn ghost" style="margin-top:20px" onclick="closeSheet();quiz=null;go('test')">退出</button>
      <button class="btn" style="margin-top:10px" onclick="closeSheet()">继续答题</button>`);
  } else { quiz = null; go('test'); }
}

function finishQuiz() {
  const { s, ans } = quiz;
  const max = (s.optionsPer ? s.optionsPer[0].length : s.options.length) - 1;
  let score = 0;
  ans.forEach((a, i) => score += (s.reverse && s.reverse.includes(i)) ? (max - a) : a);
  const lv = s.levels.find(l => score <= l.max) || s.levels[s.levels.length - 1];
  const rec = { id: s.id, ts: Date.now(), score, label: lv.label, ans: [...ans] };
  DB.tests.push(rec); save();
  renderReport(s, score, lv, ans);
  quiz = null;
  go('report');
}

function renderReport(s, score, lv, ans) {
  const totalMax = s.levels[s.levels.length - 1].max;
  const tone = { ok: '#7FA396', mild: '#A8BFA0', mid: '#E0C08A', high: '#DDA98F' }[lv.tone];
  const risk = s.riskItem != null && ans[s.riskItem] > 0;
  const hist = DB.tests.filter(t => t.id === s.id).sort((a, b) => a.ts - b.ts);
  const prev = hist.length > 1 ? hist[hist.length - 2] : null;

  $('#report-body').innerHTML = `
  <div class="card" style="border-radius:var(--r-xl);padding:24px 20px">
    <div style="text-align:center"><div class="tiny" style="letter-spacing:2px">${s.name}</div></div>
    <div class="gauge">
      <div class="gv" style="color:${tone}">${score}</div>
      <div class="gm">总分 / ${totalMax}</div>
      <div class="gl" style="background:${tone}22;color:${tone}">${lv.label}</div>
      ${prev ? `<div class="tiny" style="margin-top:10px">上次 ${prev.score} 分 · ${score < prev.score ? `<span style="color:var(--p)">↓ 下降 ${prev.score - score}</span>` : score > prev.score ? `<span style="color:var(--a)">↑ 上升 ${score - prev.score}</span>` : '持平'}</div>` : ''}
    </div>
    <div class="bands">
      ${s.levels.map((l, i) => {
        const lo = i === 0 ? 0 : s.levels[i - 1].max + 1;
        const isCur = l.label === lv.label;
        const c = { ok: '#7FA396', mild: '#A8BFA0', mid: '#E0C08A', high: '#DDA98F' }[l.tone];
        return `<div class="band ${isCur ? 'cur' : ''}">
          <div class="bl">${l.label}</div>
          <div class="bw"><i style="width:${isCur ? 100 : 0}%;background:${c};transition:width .8s ${i * .08}s"></i></div>
          <div class="bn">${lo}-${l.max}</div></div>`;
      }).join('')}
    </div>
  </div>

  <div class="card" style="margin-top:12px">
    <div class="h2" style="margin-bottom:9px">这个分数意味着什么</div>
    <div class="sub">${lv.text}</div>
  </div>

  ${risk ? `<div class="crisis" style="margin-top:12px">
    <div class="ch"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B4634A" stroke-width="2.2" stroke-linecap="round"><path d="M12 8.5v5M12 17h.01"/><circle cx="12" cy="12" r="9.2"/></svg><b>需要认真对待的一项</b></div>
    <p>你在第 9 题（关于伤害自己的念头）上有勾选。无论分数高低，这一项都值得被认真对待。请尽快联系专业人员或信任的人。</p>
    ${CRISIS_LINES.map(l => `<div class="line"><div><b>${l.name}</b><i>${l.note}</i></div><em>${l.num}</em></div>`).join('')}
  </div>` : ''}

  <div class="card" style="margin-top:12px">
    <div class="h2" style="margin-bottom:11px">接下来可以做的</div>
    ${suggestFor(s.id, lv.tone).map((a, i) => `<div class="advice"><i>${i + 1}</i><div>${a}</div></div>`).join('')}
  </div>

  <div class="sec-t"><b>配套练习</b></div>
  ${matchPractice(s.id).map(p => `<button class="rec" onclick="${p.b ? `playBreath('${p.id}')` : `playMed('${p.id}')`}">
      <div class="rc" style="background:${p.color}22">${p.b ? iconWind(p.color) : iconLeaf(p.color)}</div>
      <div class="rt"><b>${p.name}</b><i>${p.desc}</i></div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4BCB4" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button>`).join('')}

  <div style="padding:18px 0 8px">
    <button class="btn ghost" onclick="go('test')">返回测评列表</button>
  </div>
  <div class="disclaimer" style="margin:8px 0 30px">本报告由自评量表生成，反映的是你此刻的主观感受，不能替代医学诊断。情绪状态会随时间波动，建议每 2 周复测一次观察趋势。</div>`;
}

function suggestFor(id, tone) {
  const common = { ok: ['保持现在的节奏，规律作息是最好的心理保健。', '可以把这份状态记下来，将来低谷时提醒自己："我曾经是这样的"。'], mild: ['优先保证睡眠，很多情绪问题的底层是睡不好。', '每天安排一件确定能带来愉悦的小事，哪怕只有 10 分钟。', '两周后再测一次，看趋势比看单次分数更重要。'], mid: ['建议预约一次专业心理咨询，先聊 1 次也算数。', '把这份报告存下来，见咨询师时可以直接给对方看。', '告诉一个信任的人你的状态，不要独自扛。'], high: ['请尽快前往医院精神心理科或专业机构做面对面评估。', '这不是意志力的问题，专业干预（含药物）是安全且有效的。', '在就诊前，把危机热线存进手机通讯录。'] }[tone];
  const extra = { phq9: '每天出门走 20 分钟，运动对轻中度抑郁的效果接近药物。', gad7: '试试每天固定 10 分钟"担忧时间"，其余时间出现担忧就记下来推迟到那时。', isi: '严格固定起床时间，不补觉、不午睡超过 30 分钟。', pss10: '列一张清单：哪些事我能控制，哪些不能。只在能控制的那栏花力气。' }[id];
  return [...common, extra].filter(Boolean);
}
function matchPractice(id) {
  const m = {
    phq9: [MEDITATIONS.find(x => x.id === 'selfcomp'), MEDITATIONS.find(x => x.id === 'bodyscan')],
    gad7: [{ ...BREATH_PATTERNS[0], b: 1 }, MEDITATIONS.find(x => x.id === 'ground')],
    isi: [MEDITATIONS.find(x => x.id === 'sleep'), { ...BREATH_PATTERNS[0], b: 1 }],
    pss10: [{ ...BREATH_PATTERNS[1], b: 1 }, MEDITATIONS.find(x => x.id === 'anchor')],
  }[id] || [];
  return m.map(x => ({ ...x, desc: x.b ? `呼吸练习 · ${x.rounds} 轮` : `${x.tag} · ${x.dur} 分钟` }));
}

/* ============================================================
   静一静：冥想 / 呼吸 / 白噪音
   ============================================================ */
function renderBreath() {
  $('#breath-body').innerHTML = `
    <div class="sec-t" style="margin-top:4px"><b>呼吸练习</b><a>跟着节奏就好</a></div>
    ${BREATH_PATTERNS.map(b => `<button class="rec" onclick="playBreath('${b.id}')">
      <div class="rc" style="background:${b.color}22">${iconWind(b.color)}</div>
      <div class="rt"><b>${b.name}</b><i>${b.desc}</i></div>
      <div style="width:30px;height:30px;border-radius:50%;background:${b.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5l13 7.5-13 7.5z"/></svg></div>
    </button>`).join('')}

    <div class="sec-t"><b>引导冥想</b><a>无需盘腿</a></div>
    <div class="grid2">
      ${MEDITATIONS.map(m => `<button class="medcard" style="background:linear-gradient(150deg,${m.color}1F,${m.color}33)" onclick="playMed('${m.id}')">
        <div><b class="mt">${m.name}</b><i class="md">${m.desc}</i></div>
        <div class="mb"><i>${m.tag} · ${m.dur} 分钟</i>
          <div class="pl"><svg width="10" height="10" viewBox="0 0 24 24" fill="${m.color}"><path d="M7 4.5l13 7.5-13 7.5z"/></svg></div></div>
      </button>`).join('')}
    </div>

    <div class="sec-t"><b>环境音</b><a>浏览器实时合成</a></div>
    <div class="sounds" style="margin:0;padding-left:0">${SOUNDSCAPES.map(s =>
      `<button class="sound" id="snd2-${s.id}" style="background:${s.color}1A" onclick="toggleSound('${s.id}','${s.color}')">
        <div class="wave" style="background:${s.color}"></div>
        <span style="position:relative;z-index:2">${s.emoji}</span><b style="position:relative;z-index:2">${s.name}</b></button>`).join('')}
    </div>
    <div class="tiny" style="margin-top:12px;line-height:1.8;padding-bottom:26px">环境音可以和冥想、呼吸同时播放。切到别的页面也会继续响，再点一次停止。</div>`;
  SOUNDSCAPES.forEach(s => { if (audioNodes[s.id]) markSound(s.id, s.color, true); });
}

/* ---------------- 播放器 ---------------- */
let P = null;
function playBreath(id) {
  const b = BREATH_PATTERNS.find(x => x.id === id);
  const cycle = b.steps.reduce((s, x) => s + x[1], 0);
  P = { type: 'breath', d: b, total: cycle * b.rounds, t: 0, playing: false, si: 0, sleft: 0, round: 1, speed: 1 };
  $('#pv-name').textContent = b.name;
  $('#player-view').style.background = `linear-gradient(170deg,${shade(b.color, -.55)},${shade(b.color, -.78)})`;
  $('#pv-script').textContent = '准备好了就开始，跟着圆圈的节奏';
  $('#pv-phase').textContent = '准备';
  $('#pv-cd').textContent = b.rounds + ' 轮';
  $('#pv-orb').style.transform = 'scale(1)';
  $('#pv-speed').style.display = 'none';
  resetPV();
  go('player');
}
function playMed(id) {
  const m = MEDITATIONS.find(x => x.id === id);
  P = { type: 'med', d: m, total: m.dur * 60, t: 0, playing: false, li: -1, speed: 4 };
  $('#pv-name').textContent = m.name;
  $('#player-view').style.background = `linear-gradient(170deg,${shade(m.color, -.55)},${shade(m.color, -.8)})`;
  $('#pv-script').textContent = '找个舒服的姿势，闭上眼睛';
  $('#pv-phase').textContent = m.tag;
  $('#pv-cd').textContent = m.dur + '′';
  $('#pv-orb').style.transform = 'scale(1)';
  $('#pv-speed').style.display = '';
  $('#pv-speed').textContent = '×4 体验加速';
  resetPV();
  go('player');
}
function toggleSpeed() {
  if (!P || P.type !== 'med') return;
  P.speed = P.speed === 4 ? 1 : 4;
  $('#pv-speed').textContent = P.speed === 4 ? '×4 体验加速' : '×1 真实时长';
  toast(P.speed === 4 ? '已开启体验加速，适合快速预览' : '恢复真实时长');
}
function resetPV() {
  $('#pv-bar').style.width = '0';
  $('#pv-t1').textContent = '00:00';
  $('#pv-t2').textContent = mm(P.total);
  setPlayIcon(false);
}
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = x => Math.round(p < 0 ? x * (1 + p) : x + (255 - x) * p);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function setPlayIcon(on) {
  $('#pv-btn').innerHTML = on
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="#2F3A38"><rect x="6" y="4.5" width="4" height="15" rx="1.6"/><rect x="14" y="4.5" width="4" height="15" rx="1.6"/></svg>'
    : '<svg width="26" height="26" viewBox="0 0 24 24" fill="#2F3A38"><path d="M7.5 4.6l12.5 7.4-12.5 7.4z"/></svg>';
}
function togglePlay() {
  if (!P) return;
  P.playing = !P.playing;
  setPlayIcon(P.playing);
  if (P.playing) { if (P.type === 'breath') startBreathLoop(); else startMedLoop(); }
  else { clearInterval(P.timer); $('#pv-orb').style.transform = 'scale(1)'; }
}
function stopPlayer() {
  if (P) { clearInterval(P.timer); if (P.t > 20) { DB.minutes += Math.round(P.t / 60); save(); } }
  P = null; go('breath');
}

function startBreathLoop() {
  const b = P.d;
  if (P.sleft <= 0) { P.si = 0; P.sleft = b.steps[0][1]; applyBreathPhase(); }
  P.timer = setInterval(() => {
    P.t++; P.sleft--;
    updateBar();
    $('#pv-cd').textContent = Math.max(P.sleft, 0);
    if (P.sleft <= 0) {
      P.si++;
      if (P.si >= b.steps.length) { P.si = 0; P.round++; }
      if (P.t >= P.total) return finishPV('做完了。感觉身体沉下来一点了吗？');
      P.sleft = b.steps[P.si][1];
      applyBreathPhase();
    }
  }, 1000);
  applyBreathPhase();
}
function applyBreathPhase() {
  const b = P.d, [name, sec] = b.steps[P.si];
  $('#pv-phase').textContent = name;
  $('#pv-cd').textContent = sec;
  const orb = $('#pv-orb');
  orb.style.transitionDuration = sec + 's';
  orb.style.transform = name === '吸气' ? 'scale(1.24)' : name === '呼气' ? 'scale(.76)' : orb.style.transform || 'scale(1)';
  $('#pv-script').textContent = `第 ${P.round} / ${b.rounds} 轮　·　${name === '吸气' ? '用鼻子，慢慢地' : name === '呼气' ? '用嘴巴，像吹蜡烛' : '保持住，不用紧张'}`;
}

function startMedLoop() {
  const m = P.d, per = P.total / m.script.length;
  P.timer = setInterval(() => {
    P.t += P.speed;
    if (P.t >= P.total) return finishPV('结束了。慢慢睁开眼睛，不用着急起来。');
    updateBar();
    const idx = Math.min(Math.floor(P.t / per), m.script.length - 1);
    if (idx !== P.li) {
      P.li = idx;
      const el = $('#pv-script');
      el.style.opacity = 0;
      setTimeout(() => { el.textContent = m.script[idx]; el.style.opacity = 1; }, 400);
      const orb = $('#pv-orb');
      orb.style.transitionDuration = '4s';
      orb.style.transform = idx % 2 ? 'scale(1.1)' : 'scale(.94)';
    }
    $('#pv-cd').textContent = Math.max(Math.ceil((P.total - P.t) / 60), 0) + '′';
  }, 1000);
}
function updateBar() {
  $('#pv-bar').style.width = (P.t / P.total * 100) + '%';
  $('#pv-t1').textContent = mm(P.t);
  $('#pv-t2').textContent = mm(P.total - P.t);
}
function finishPV(msg) {
  clearInterval(P.timer); P.playing = false; setPlayIcon(false);
  $('#pv-bar').style.width = '100%';
  $('#pv-phase').textContent = '完成';
  $('#pv-cd').textContent = '✓';
  $('#pv-script').textContent = msg;
  $('#pv-orb').style.transform = 'scale(1)';
  DB.minutes += Math.round(P.total / 60); save();
}

/* ============================================================
   Web Audio 白噪音合成
   ============================================================ */
let AC = null, audioNodes = {};
function ctx() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }

function noiseBuffer(c, brown) {
  const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  if (brown) { let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .022 * w) / 1.022; d[i] = last * 3.4; } }
  else { for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
  return buf;
}

function toggleSound(id, color) {
  const s = SOUNDSCAPES.find(x => x.id === id);
  if (audioNodes[id]) { stopSound(id); markSound(id, color, false); return; }
  const c = ctx();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, s.type !== 'rain');
  src.loop = true;
  const filt = c.createBiquadFilter();
  const g = c.createGain();
  g.gain.value = 0;
  const extra = [];

  if (s.type === 'rain') { filt.type = 'bandpass'; filt.frequency.value = 1400; filt.Q.value = .5; }
  else if (s.type === 'ocean') { filt.type = 'lowpass'; filt.frequency.value = 620; }
  else if (s.type === 'wind') { filt.type = 'lowpass'; filt.frequency.value = 420; }
  else if (s.type === 'fire') { filt.type = 'lowpass'; filt.frequency.value = 900; }
  else { filt.type = 'lowpass'; filt.frequency.value = 260; }

  src.connect(filt); filt.connect(g); g.connect(c.destination);
  src.start();
  g.gain.linearRampToValueAtTime(s.type === 'rain' ? .16 : .3, c.currentTime + 1.4);

  // 慢速起伏（海浪 / 风）
  if (s.type === 'ocean' || s.type === 'wind') {
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = s.type === 'ocean' ? .11 : .07;
    lg.gain.value = s.type === 'ocean' ? .16 : .12;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    extra.push(lfo);
  }
  // 篝火噼啪
  let crackle = null;
  if (s.type === 'fire') {
    crackle = setInterval(() => {
      if (!audioNodes[id]) return;
      const o = c.createBufferSource(), og = c.createGain(), of_ = c.createBiquadFilter();
      o.buffer = noiseBuffer(c, false); o.loop = false;
      of_.type = 'bandpass'; of_.frequency.value = 1600 + Math.random() * 2200; of_.Q.value = 2;
      og.gain.setValueAtTime(.001, c.currentTime);
      og.gain.linearRampToValueAtTime(.05 + Math.random() * .07, c.currentTime + .008);
      og.gain.exponentialRampToValueAtTime(.0008, c.currentTime + .09);
      o.connect(of_); of_.connect(og); og.connect(c.destination);
      o.start(); o.stop(c.currentTime + .12);
    }, 180 + Math.random() * 220);
  }
  audioNodes[id] = { src, g, extra, crackle };
  markSound(id, color, true);
  toast(s.name + ' · 播放中');
}
function stopSound(id) {
  const n = audioNodes[id]; if (!n) return;
  const c = ctx();
  n.g.gain.cancelScheduledValues(c.currentTime);
  n.g.gain.setValueAtTime(n.g.gain.value, c.currentTime);
  n.g.gain.linearRampToValueAtTime(0, c.currentTime + .5);
  setTimeout(() => { try { n.src.stop(); n.extra.forEach(e => e.stop()); } catch (e) {} }, 600);
  if (n.crackle) clearInterval(n.crackle);
  delete audioNodes[id];
}
function stopAudioAll() {}
function markSound(id, color, on) {
  ['snd-', 'snd2-'].forEach(p => {
    const el = document.getElementById(p + id); if (!el) return;
    el.classList.toggle('on', on);
    el.style.background = on ? color : color + '1A';
  });
}

/* ============================================================
   我的
   ============================================================ */
function renderMe() {
  const days = Math.max(1, Math.ceil((Date.now() - DB.first) / 864e5));
  $('#me-since').textContent = `在心屿的第 ${days} 天`;
  $('#me-stats').innerHTML = `
    <div class="stat"><b>${DB.moods.length}</b><i>心情记录</i></div>
    <div class="stat"><b>${DB.sessions.length}</b><i>倾诉次数</i></div>
    <div class="stat"><b>${DB.minutes}</b><i>静心分钟</i></div>
    <div class="stat"><b>${streakDays()}</b><i>连续天数</i></div>`;

  const ms = [...DB.moods].sort((a, b) => a.ts - b.ts).slice(-14);
  $('#me-body').innerHTML = `
    <div class="sec-t"><b>情绪走势</b><a onclick="go('mood')">详情 ›</a></div>
    <div class="chartcard">${lineChart(ms)}</div>

    <div class="sec-t"><b>倾诉档案</b><a>${DB.sessions.length} 次</a></div>
    ${DB.sessions.length ? DB.sessions.slice(0, 6).map(s => {
      const d = new Date(s.ts);
      return `<button class="sumitem" onclick="openArchive('${s.id}')">
        <div class="sh"><b>${s.topic}</b><i>${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</i></div>
        <div class="tagline" style="margin-bottom:7px">${s.tags.map(t => `<span>${t}</span>`).join('')}
          ${s.i1 != null && s.i2 != null ? `<span style="background:var(--a-l);color:#B4785C">${s.i1} → ${s.i2}</span>` : ''}</div>
        <p>${esc(s.situation || s.thought || '一次自由倾诉')}</p></button>`;
    }).join('') : `<div class="empty">
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#D8D0C8" stroke-width="1.6"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 4 11.5a8.4 8.4 0 0 1 8.5-8.4h.5a8.4 8.4 0 0 1 8 8.4z"/></svg>
      <p>还没有倾诉记录<br>和小屿聊完一次，这里会自动生成总结</p>
      <button class="btn soft" style="width:auto;padding:0 22px;margin:16px auto 0;height:42px" onclick="go('chat')">去聊聊</button></div>`}

    <div class="sec-t"><b>设置</b></div>
    ${[
      ['隐私与数据', '所有内容仅存本机 · 从不上传', '#7FA396', 'lock'],
      ['每日提醒', '固定时间轻轻提醒你记录', '#8FA9BF', 'bell'],
      ['真人咨询师', '需要时，把你转介给专业的人', '#DDA98F', 'user'],
      ['危机热线', '24 小时 · 随时可打', '#C98B8B', 'phone'],
    ].map(([t, s, c, ic]) => `<button class="listitem" onclick="settingTap('${t}')">
      <div class="li" style="background:${c}22">${settingIcon(ic, c)}</div>
      <div class="lt"><b>${t}</b><i>${s}</i></div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D0C8C0" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg></button>`).join('')}

    <button class="btn ghost" style="margin-top:14px" onclick="resetAll()">清空全部本地数据</button>
    <div class="disclaimer">心屿不是医疗器械，不提供诊断或治疗建议。你在这里输入的所有内容都保存在本机浏览器中，不会上传到任何服务器。<br><br>如遇紧急情况请拨打 <b>12356</b> 或 <b>120</b>。</div>
    <div style="height:20px"></div>`;
}
function settingIcon(t, c) {
  const s = { lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>', bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.2 7.5-2.2 7.5h16.4S18 14.5 18 8.5z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>', user: '<circle cx="12" cy="8" r="3.6"/><path d="M5.5 20c0-3.7 2.9-5.8 6.5-5.8s6.5 2.1 6.5 5.8"/>', phone: '<path d="M21 16.5v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6A2 2 0 0 1 3.3 2H6a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7A2 2 0 0 1 21 16.5z"/>' }[t];
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${s}</svg>`;
}
function settingTap(t) {
  if (t === '危机热线') {
    openSheet(`<div style="text-align:center"><div class="h2">24 小时危机热线</div><div class="sub" style="margin-top:6px">拨打是免费的，也是匿名的</div></div>
      <div style="margin-top:18px">${CRISIS_LINES.map(l => `<div class="listitem"><div class="lt"><b>${l.name}</b><i>${l.note}</i></div>
        <b style="color:#B4634A;font-size:15px">${l.num}</b></div>`).join('')}</div>
      <button class="btn ghost" style="margin-top:12px" onclick="closeSheet()">关闭</button>`);
  } else if (t === '真人咨询师') {
    openSheet(`<div style="text-align:center"><div class="h2">转介真人咨询</div>
      <div class="sub" style="margin-top:8px;text-align:left;padding:0 4px">AI 有明确的边界。当出现以下情况时，心屿会主动建议你联系真人：<br><br>
      · 量表得分达到中度以上<br>· 对话中出现自伤或伤人相关表达<br>· 连续两周情绪记录持续低位<br>· 你主动要求<br><br>
      正式版会接入持证咨询师预约与转介流程。</div></div>
      <button class="btn" style="margin-top:18px" onclick="closeSheet()">明白了</button>`);
  } else if (t === '隐私与数据') {
    openSheet(`<div style="text-align:center"><div class="h2">你的数据在哪</div></div>
      <div class="sub" style="margin-top:14px;text-align:left;padding:0 4px">
      · 心情记录、对话内容、测评结果全部保存在你这台设备的浏览器里<br><br>
      · 没有账号体系，不需要注册，也不会上传<br><br>
      · 清除浏览器数据或点击"清空全部本地数据"即可彻底删除<br><br>
      · 正式版如需云端同步，将采用端到端加密，且默认关闭</div>
      <button class="btn" style="margin-top:18px" onclick="closeSheet()">好</button>`);
  } else {
    toast('原型演示，此功能未实现');
  }
}
function openArchive(id) {
  const s = DB.sessions.find(x => x.id === id);
  if (!s) return;
  renderSummary(s); go('summary');
}
function resetAll() {
  openSheet(`<div style="text-align:center"><div class="h2">清空全部数据？</div>
    <div class="sub" style="margin-top:8px">所有心情记录、倾诉档案和测评结果都会被删除，无法恢复。</div></div>
    <button class="btn" style="margin-top:20px;background:#C98B8B;box-shadow:none" onclick="doReset()">确认清空</button>
    <button class="btn ghost" style="margin-top:10px" onclick="closeSheet()">取消</button>`);
}
function doReset() { localStorage.removeItem(KEY); DB = { moods: [], sessions: [], tests: [], minutes: 0, first: Date.now() }; save(); closeSheet(); toast('已清空'); renderMe(); }

/* ============================================================
   初始化
   ============================================================ */
(function init() {
  const ta = $('#input');
  ta.addEventListener('input', () => {
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
    $('#send').disabled = !ta.value.trim();
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  const clock = () => {
    const d = new Date();
    $('#sb-time').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  clock(); setInterval(clock, 20000);
  renderHome();
})();

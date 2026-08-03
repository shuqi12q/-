import { Story, CopingStyle } from "./types";

// 剧本《那次小组作业》—— 健康教育「人际边界」主题
// 用户先选一个角色（一种应对风格），再以该角色视角走完 4 幕并做选择；
// 结局解读 = 所选角色的应对风格，并回看用户自己的选择路径。

export const STORY: Story = {
  id: "boundary",
  title: "那次小组作业",
  theme: "人际边界",
  start: "act1",
  characters: [
    {
      id: "xiaoman",
      name: "小满",
      coping: "avoid",
      color: "#C08A5E",
      symbol: "M4 20 Q 12 4 20 20",
      blurb: "习惯把事往后放，能不正面碰就不碰，觉得熬一熬就过去了。",
      learnGoal: "看见回避带来的短期轻松，与长期代价。",
    },
    {
      id: "ashu",
      name: "阿树",
      coping: "please",
      color: "#7C9885",
      symbol: "M4 16 Q 12 22 20 16",
      blurb: "总怕别人不高兴，别人一张口就点头，自己的事总排在最后。",
      learnGoal: "看清『讨好』背后的边界成本。",
    },
    {
      id: "lin",
      name: "凛",
      coping: "direct",
      color: "#456B71",
      symbol: "M4 12 H20 M14 6 L20 12 L14 18",
      blurb: "有话直说，不太绕弯子，但火上来时容易说重了。",
      learnGoal: "区分『攻击性表达』和『坚定表达』。",
    },
    {
      id: "he",
      name: "禾",
      coping: "seek",
      color: "#4A6B57",
      symbol: "M12 4 V12 M12 12 L4 20 M12 12 L20 20",
      blurb: "一个人扛不住的时候，会去找朋友或老师聊一聊。",
      learnGoal: "体会『示弱不是软弱』。",
    },
  ],
  nodes: {
    act1: {
      id: "act1",
      act: 1,
      speaker: "第一幕 · 周五晚上",
      text: "这周的小组作业，组长在周五晚上发来消息：『大家，我加了点东西，周末辛苦一下，周日交哈～』你看到消息时，已经累了一周。",
      choices: [
        { label: "「好的没问题！」（哪怕你其实想休息）", next: "act2", coping: "please" },
        { label: "假装没看见，周一再说", next: "act2", coping: "avoid" },
        { label: "「周末我有点事，周一前尽力，但不能保证全做完」", next: "act2", coping: "direct" },
        { label: "先找组员聊聊能不能分摊一点", next: "act2", coping: "seek" },
      ],
    },
    act2: {
      id: "act2",
      act: 2,
      speaker: "第二幕 · 群里",
      text: "你辛苦写的方案，被组员直接改了一大半，连声招呼都没打。你在群里看到新版本时，心里一沉。",
      choices: [
        { label: "算了，随他们吧", next: "act3", coping: "avoid" },
        { label: "「改得挺好！听大家的」", next: "act3", coping: "please" },
        { label: "「这版和我本意差太多，我们得对一下」", next: "act3", coping: "direct" },
        { label: "私聊组长，说你有点懵", next: "act3", coping: "seek" },
      ],
    },
    act3: {
      id: "act3",
      act: 3,
      speaker: "第三幕 · 深夜",
      text: "其实你从周三就开始失眠，但谁都没说。深夜，你看着还没动的文档，手机亮着。",
      choices: [
        { label: "再撑一撑，明天就好", next: "act4", coping: "avoid" },
        { label: "发条朋友圈「我没事」", next: "act4", coping: "please" },
        { label: "承认自己真的累了，写下来", next: "act4", coping: "direct" },
        { label: "给好朋友发「我有点崩」", next: "act4", coping: "seek" },
      ],
    },
    act4: {
      id: "act4",
      act: 4,
      speaker: "第四幕 · 周一复盘",
      text: "复盘会上，老师问：『这次配合得怎么样？有没有谁压力特别大？』全场安静。",
      choices: [
        { label: "笑着摇头，说都挺顺的", next: "end", coping: "avoid" },
        { label: "「大家都很棒！」", next: "end", coping: "please" },
        { label: "「其实我周末有点扛不住，下次想提前说」", next: "end", coping: "direct" },
        { label: "会后找老师单独聊了聊", next: "end", coping: "seek" },
      ],
    },
  },
};

export interface Ending {
  title: string;
  body: string;
  action: string;
}

export const ENDINGS: Record<CopingStyle, Ending> = {
  avoid: {
    title: "你绕开了那一下",
    body: "你一次次把话咽了回去。当下是轻松了，可那些没说出口的，最后都变成了深夜里的疲惫。回避让你暂时安全，却也让你离被理解更远。",
    action: "明天试着把一件『想说没说』的事，说出口一点点。",
  },
  please: {
    title: "你又点了头",
    body: "你怕别人不高兴，把自己的需要排在最后。可一直点头的代价，是慢慢弄丢了自己。讨好换来的和平，常常是你一个人在买单。",
    action: "下次别人提要求时，先停三秒，问自己：这是我真心想做的吗？",
  },
  direct: {
    title: "你把话摊开了",
    body: "你愿意把真实想法说出来，这很难得。只是有时火一上来，话就重了——坚定地表达，和带着攻击地表达，中间只差一点点觉察。",
    action: "下次开口前，先说你感受到的，再提你想要的。",
  },
  seek: {
    title: "你伸出了手",
    body: "你没有一个人硬扛，而是去找了能接住你的人。示弱不是软弱，是把重量分出去一点点。被接住过的感觉，值得你记住。",
    action: "记住这次被接住的感觉，下次可以更早一点开口。",
  },
};

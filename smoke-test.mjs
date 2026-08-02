/* 冒烟测试：用 jsdom 加载原型，跑一遍主要交互路径，捕获运行时错误 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/13182/.workbuddy/binaries/node/workspace/x.js');
const { JSDOM } = req('jsdom');

const dir = path.resolve('.');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: undefined,
  url: 'http://localhost/',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.AudioContext = class { constructor(){this.state='running';this.sampleRate=44100;this.currentTime=0;this.destination={};}
      createBuffer(c,l,r){return {getChannelData:()=>new Float32Array(l)};}
      createBufferSource(){return {connect(){},start(){},stop(){},buffer:null,loop:false};}
      createBiquadFilter(){return {connect(){},type:'',frequency:{value:0},Q:{value:0}};}
      createGain(){return {connect(){},gain:{value:0,linearRampToValueAtTime(){},setValueAtTime(){},cancelScheduledValues(){},exponentialRampToValueAtTime(){}}};}
      createOscillator(){return {connect(){},start(){},stop(){},frequency:{value:0}};}
      resume(){} };
    w.onerror = (m) => errors.push('window.onerror: ' + m);
  },
});
const w = dom.window;
w.addEventListener('error', e => errors.push('error event: ' + (e.error?.stack || e.message)));

// 手动注入脚本（jsdom 不加载外部 src）
for (const f of ['data.js', 'app.js']) {
  const s = w.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(dir, f), 'utf8');
  try { w.document.body.appendChild(s); } catch (e) { errors.push(`[${f}] ${e.stack}`); }
}

const run = (label, fn) => { try { fn(); console.log('  ✓ ' + label); } catch (e) { errors.push(`[${label}] ${e.message}`); console.log('  ✗ ' + label + ' → ' + e.message); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('\n== 页面渲染 ==');
run('首页', () => w.renderHome());
run('情绪日记', () => w.renderMood());
run('测评列表', () => w.renderTests());
run('静一静', () => w.renderBreath());
run('我的', () => w.renderMe());

console.log('\n== 路由 ==');
for (const v of ['mood', 'test', 'breath', 'me', 'home']) run('go(' + v + ')', () => w.go(v));

console.log('\n== 打卡 ==');
run('打开打卡面板', () => w.openCheckin(2));
run('选表情', () => w.pickFace(4));
run('点标签', () => w.tapTag('工作'));
run('保存', () => w.saveMood());
run('标签洞察', () => w.tagDetail('工作'));
run('关闭面板', () => w.closeSheet());

console.log('\n== 量表全流程 ==');
for (const id of ['phq9', 'gad7', 'isi', 'pss10']) {
  run(id + ' 逐题作答 + 出报告', () => {
    const r = w.eval(`(function(){
      startQuiz('${id}');
      answerQuiz(2);                       // 走一次真实点击路径
      var n = SCALES['${id}'].n;
      for (var i=1;i<n;i++) quiz.ans[i] = (i%2===0?2:1);
      quiz.i = n-1;
      finishQuiz();
      var b = document.querySelector('#report-body').innerHTML;
      var t = DB.tests[DB.tests.length-1];
      return JSON.stringify({ok:b.indexOf('总分')>-1, score:t.score, label:t.label});
    })()`);
    const o = JSON.parse(r);
    if (!o.ok) throw new Error('报告未渲染');
    console.log(`    → 得分 ${o.score}，分级「${o.label}」`);
  });
}
run('PHQ-9 第 9 题自伤风险提示', () => {
  const ok = w.eval(`(function(){
    startQuiz('phq9');
    for (var i=0;i<9;i++){ quiz.ans[i]=3; }
    quiz.i=8; finishQuiz();
    return document.querySelector('#report-body').innerHTML.indexOf('需要认真对待')>-1;
  })()`);
  if (!ok) throw new Error('未触发风险提示');
});

console.log('\n== 播放器 ==');
run('呼吸练习', () => { w.playBreath('478'); w.togglePlay(); w.togglePlay(); });
run('引导冥想', () => { w.playMed('sleep'); w.togglePlay(); w.toggleSpeed(); w.togglePlay(); });
run('退出播放器', () => w.stopPlayer());

console.log('\n== 白噪音 ==');
run('开启雨声', () => w.toggleSound('rain', '#8FA9BF'));
run('关闭雨声', () => w.toggleSound('rain', '#8FA9BF'));
run('开启篝火', () => w.toggleSound('fire', '#DDA98F'));
run('关闭篝火', () => w.toggleSound('fire', '#DDA98F'));

console.log('\n== AI 对话全流程（焦虑 → CBT 思维记录 → 总结）==');
const chatResult = await new Promise(res => {
  w.__done = res;
  w.eval(`(async function(){
    var log=[], err=[];
    function idle(){ return new Promise(function(r){ var n=0; var t=setInterval(function(){ if(!chat.busy||n++>70){clearInterval(t);r();} },140); }); }
    function step(name, fn){ try{ fn(); log.push('✓ '+name); }catch(e){ err.push(name+': '+e.message); log.push('✗ '+name+' → '+e.message); } }

    go('chat'); chat.started=false;
    await startChat(); await idle();
    await chooseTopic('anxiety'); await idle();

    step('描述情境', function(){ $('#input').value='这周要做季度汇报，一想到就手心出汗睡不着'; sendMsg(); }); await idle();
    step('情绪打分 8', function(){ document.querySelector('#srange').value=8; answerSlider(); }); await idle();
    step('说出自动思维', function(){ $('#input').value='我肯定会讲砸，所有人都会觉得我不行'; sendMsg(); }); await idle();
    step('识别认知扭曲', function(){ answerChoice('catastrophe','灾难化'); }); await idle();
    step('找相反证据', function(){ $('#input').value='其实上次汇报领导还夸了我一句'; sendMsg(); }); await idle();
    step('认知重构', function(){ $('#input').value='紧张说明你在乎，不代表你会搞砸'; sendMsg(); }); await idle();
    step('二次打分 4', function(){ document.querySelector('#srange').value=4; answerSlider(); }); await idle();
    step('选择行动', function(){ answerChoice('breath','做一次 4-7-8 呼吸'); }); await idle();

    var checks={};
    step('生成总结卡', function(){
      endSession();
      var b=document.querySelector('#summary-body').innerHTML;
      checks.强度变化 = b.indexOf('情绪强度变化')>-1;
      checks.认知模式 = b.indexOf('灾难化')>-1;
      checks.相反证据 = b.indexOf('领导还夸')>-1;
      checks.新说法   = b.indexOf('紧张说明你在乎')>-1;
      checks.建议     = b.indexOf('小屿的建议')>-1;
      checks.情绪标签 = b.indexOf('焦虑')>-1;
      for (var k in checks) if(!checks[k]) throw new Error('总结缺少「'+k+'」');
      var s=DB.sessions[0]; checks.降幅 = s.i1+' → '+s.i2;
    });
    step('档案回看', function(){ renderMe(); openArchive(DB.sessions[0].id); });

    // 危机干预
    chat.started=false; go('chat'); await startChat(); await idle();
    $('#input').value='我最近总觉得活着没意思，不想活了'; sendMsg();
    await new Promise(function(r){setTimeout(r,4500);});
    var h=document.querySelector('#msgs').innerHTML;
    if (h.indexOf('12356')>-1 && h.indexOf('请先联系真实的人')>-1) log.push('✓ 危机词触发热线卡片');
    else { err.push('危机干预未触发'); log.push('✗ 危机干预未触发'); }

    // 自由聊天关键词
    chat.started=false; go('chat'); await startChat(); await idle();
    await chooseTopic('free'); await idle();
    $('#input').value='就是很累，什么都不想做'; sendMsg();
    await idle();
    var last=document.querySelectorAll('#msgs .msg.bot');
    log.push(last.length>3 ? '✓ 自由聊天关键词回应正常' : '✗ 自由聊天无回应');

    log.push('✓ localStorage 已写入: '+(!!localStorage.getItem('xinyu_v1')));
    __done(JSON.stringify({log:log, err:err, checks:checks}));
  })()`);
});
const cr = JSON.parse(chatResult);
cr.log.forEach(l => console.log('  ' + l));
if (cr.checks.降幅) console.log('    → 总结卡完整：情绪标签 / 强度 ' + cr.checks.降幅 + ' / 认知模式 / 证据 / 重构 / 建议');
cr.err.forEach(e => errors.push('[对话] ' + e));

console.log('\n' + '='.repeat(46));
if (errors.length) { console.log('发现 ' + errors.length + ' 个问题：'); errors.forEach(e => console.log('  · ' + e)); process.exitCode = 1; }
else console.log('全部通过，无运行时错误');
console.log('='.repeat(46) + '\n');
w.close();

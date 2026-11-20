// 데모 HTML을 mp4로 뽑는다. 웹에서 보던 그 장면이 프레임 단위로 그대로 나온다.
//   npm i playwright && npx playwright install chromium   (ffmpeg 필요)
//   node render.cjs timeslip-five-eras.html out.mp4 [fps=30]
//   node render.cjs timeslip-five-eras.html still 2.5,7.1   → st-2.5.jpg, st-7.1.jpg
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [file, out, arg] = process.argv.slice(2);
  const b = await chromium.launch();
  const url = 'file://' + path.resolve(file) + '?render=1';
  let p = await b.newPage();
  await p.goto(url);
  await p.waitForFunction('window.READY');
  const { w, h, dur } = await p.evaluate('({w:MOTION.w,h:MOTION.h,dur:MOTION.dur})');
  await p.setViewportSize({ width: w, height: h });
  if (out === 'still') {
    for (const t of arg.split(',')) {
      await p.evaluate(t => window.renderAt(t), +t);
      await p.screenshot({ path: `st-${t}.jpg`, type: 'jpeg', quality: 85 });
    }
    return b.close();
  }
  const FPS = +arg || 30;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', FPS, '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', process.env.CRF || '18', '-preset', 'medium', '-movflags', '+faststart', out]);
  const N = Math.round(dur * FPS);
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => window.renderAt(t), i / FPS); // 시계 대신 프레임 번호로 시간을 정한다
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log(out, N, 'frames');
})();

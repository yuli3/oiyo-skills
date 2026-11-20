#!/usr/bin/env node
// 새 모션 HTML 뼈대를 만든다. frame = f(t) 계약(window.MOTION)과 stage.js·kit.js 연결이 들어 있다.
//   node new-motion.mjs <폴더> <slug> [가로 세로 길이초]
//   node new-motion.mjs ./my-ad spring-sale 1080 1920 12
// 폴더에 stage.js·kit.js·common.css가 없으면 스킬의 assets에서 복사한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [dir, slug, w = '1080', h = '1920', dur = '10'] = process.argv.slice(2);
if (!dir || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('사용법: node new-motion.mjs <폴더> <slug(영문 소문자·숫자·-)> [가로 세로 길이초]');
  process.exit(1);
}
const assets = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
for (const f of ['stage.js', 'kit.js', 'common.css']) {
  const to = path.join(dir, f);
  if (!fs.existsSync(to)) fs.copyFileSync(path.join(assets, f), to);
}
const file = path.join(dir, `${slug}.html`);
if (fs.existsSync(file)) { console.error(`이미 있어요: ${file}`); process.exit(1); }
fs.writeFileSync(file, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${slug}</title>
<link rel="stylesheet" href="common.css">
</head>
<body>
<div id="s"></div>
<script src="kit.js"></script>
<script>
// ${slug} — ${w}×${h}, ${dur}초. render(t)는 시간 t(초)만 보고 그 순간의 화면을 그린다. 상태를 쌓지 않는다.
const title = el(\`<div class="abs c" style="top:${Math.round(+h * 0.42)}px;font-weight:800;font-size:${Math.round(+w / 9)}px;letter-spacing:-.045em"><span class="mask"><span id="l1">첫 문장</span></span></div>\`);
const l1 = title.querySelector('#l1');
const render = t => {
  rise(l1, sg(t, 0.3, 1.2));                 // 0.3~1.2초에 마스크 안에서 올라온다
  set(title, 1 - sg(t, ${+dur - 0.8}, ${+dur - 0.2}));  // 끝에서 사라져 반복 이음매를 만든다
};
window.MOTION = { w: ${w}, h: ${h}, dur: ${dur}, poster: 1.5, bg: '#050505', render };
</script>
<script src="stage.js"></script>
</body>
</html>
`);
console.log(`만들었어요: ${file}\n브라우저로 열어 확인 → node render.cjs ${file} out.mp4`);

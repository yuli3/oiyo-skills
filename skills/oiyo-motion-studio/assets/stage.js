/* OIYO 모션 스테이지 — frame = f(t).
 * 각 데모는 #s(고정 크기 무대)와 window.MOTION = { w, h, dur, poster, render(t) } 만 정의한다.
 * 이 파일이 화면 맞춤, 재생 루프, 부모 페이지 제어(postMessage), 영상 렌더 모드를 맡는다.
 *   ?render=1  → 크기 그대로, 루프 없음. render.cjs가 window.renderAt(t)로 한 장씩 찍는다.
 *   ?t=3.2     → 그 시점 한 장만 그리고 멈춤(포스터·썸네일용).
 *   그 외      → 화면에 맞춰 축소하고 반복 재생. 탭하면 일시정지.
 * 같은 t에는 언제나 같은 그림이 나온다. 그래서 웹 데모와 mp4가 프레임 단위로 같다. */
(function () {
  var M = window.MOTION;
  var S = document.getElementById('s');
  if (!M || !S) return;
  var q = new URLSearchParams(location.search);
  var mode = q.has('render') ? 'render' : q.has('t') ? 'still' : 'play';
  var W = M.w, H = M.h, DUR = M.dur;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var embedded = window.parent !== window;

  document.documentElement.style.cssText += ';margin:0;height:100%;overflow:hidden;background:' + (M.bg || '#050505');
  document.body.style.cssText += ';margin:0;height:100%;overflow:hidden';
  S.style.position = 'absolute';
  S.style.left = '0';
  S.style.top = '0';
  S.style.width = W + 'px';
  S.style.height = H + 'px';
  S.style.transformOrigin = '0 0';

  function fit() {
    if (mode === 'render') { S.style.transform = 'none'; return; }
    var k = Math.min(innerWidth / W, innerHeight / H);
    S.style.transform = 'translate(' + (innerWidth - W * k) / 2 + 'px,' + (innerHeight - H * k) / 2 + 'px) scale(' + k + ')';
  }
  fit();
  addEventListener('resize', fit);

  var t = 0, playing = false, speed = 1, last = null;
  function draw() { M.render(t); }
  window.DUR = DUR;
  window.renderAt = function (x) { t = +x; draw(); };

  function post() {
    if (embedded) parent.postMessage({ type: 'motion:time', t: t, dur: DUR, playing: playing }, '*');
  }
  function loop(now) {
    if (playing) {
      if (last != null) t = (t + ((now - last) / 1000) * speed) % DUR;
      last = now;
      draw();
      post();
      requestAnimationFrame(loop);
    } else last = null;
  }
  function play() { if (playing) return; playing = true; requestAnimationFrame(loop); post(); }
  function pause() { playing = false; post(); }

  addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type !== 'motion:cmd') return;
    if (d.cmd === 'play') play();
    if (d.cmd === 'pause') pause();
    if (d.cmd === 'seek') { t = Math.max(0, Math.min(DUR - 0.001, +d.t || 0)); draw(); post(); }
    if (d.cmd === 'speed') speed = +d.speed || 1;
  });
  if (mode === 'play' && !embedded) addEventListener('click', function () { playing ? pause() : play(); });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    var imgs = [].slice.call(document.images).map(function (i) { return i.decode ? i.decode().catch(function () {}) : 0; });
    return Promise.all(imgs);
  }).then(function () {
    if (mode === 'still') { t = +q.get('t') || 0; draw(); }
    else if (mode === 'render') { t = 0; draw(); }
    else {
      // 움직임 줄이기를 켠 사람에게는 대표 장면 한 장을 보여 주고 멈춰 둔다.
      t = reduce ? (M.poster || 0) : 0;
      draw();
      if (!reduce && !q.has('paused')) play(); else post();
    }
    window.READY = true;
  });
})();

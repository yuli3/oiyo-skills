/* 작은 도구 모음 — 시간 t를 0..1 진행도로 바꾸는 함수들. 모든 데모가 같이 쓴다. */
var cl = function (v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, v)); };
var sg = function (t, a, b) { return cl((t - a) / (b - a)); };          // 구간 [a,b]에서 0→1
var eo = function (x) { return 1 - Math.pow(1 - x, 3); };               // ease-out cubic
var eo5 = function (x) { return 1 - Math.pow(1 - x, 5); };              // ease-out quint (글자 올라오기)
var eio = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }; // ease-in-out
var S = document.getElementById('s');
var el = function (html) { var d = document.createElement('div'); d.innerHTML = html.trim(); var n = d.firstChild; S.appendChild(n); return n; };
var set = function (n, o, tr) { n.style.opacity = o; if (tr !== undefined) n.style.transform = tr; };
var rise = function (n, p) { n.style.transform = 'translate3d(0,' + (1 - eo5(p)) * 110 + '%,0)'; }; // 마스크 안에서 올라오기

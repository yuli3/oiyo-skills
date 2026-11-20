---
name: oiyo-motion-studio
description: 코드로 광고·숏폼·모션을 만드는 스킬. HTML 한 장에서 화면을 시간 t의 함수(frame = f(t))로 그려, 같은 파일을 웹 데모·썸네일·mp4로 쓴다. "모션 만들어 줘", "세로 광고 영상", "쇼츠·릴스용 애니메이션", "로고 애니메이션", "카운트다운·타자기·글리치 효과", "이 HTML을 mp4로" 같은 요청에 쓴다.
---

# 코드 모션 스튜디오 (OIYO)

영상 편집기 없이 HTML 한 장으로 모션을 만든다. 화면은 시간 t(초)의 순수 함수라서 어느 순간으로든 바로 건너뛸 수 있고, 브라우저에서 프레임을 하나씩 찍으면 웹에서 본 장면과 똑같은 mp4가 나온다. 작품과 소스 예시는 https://show.oiyo.net/motion/ 에 있다.

## 파일 구성

- `assets/stage.js`: 화면 맞춤, 반복 재생, 탭하면 일시정지, 부모 페이지 제어(postMessage), 렌더 모드(`?render=1`), 정지 화면(`?t=3.2`)을 맡는다. 고치지 않는다.
- `assets/kit.js`: 시간 도구. `sg(t,a,b)`는 구간 진행도 0→1, `eo`/`eo5`/`eio`는 곡선, `el(html)`은 무대에 요소 추가, `set(n, opacity, transform)`, `rise(n, p)`는 마스크 안에서 올라오기.
- `assets/common.css`: 무대 기본값과 `.mask`, `.abs`, `.c`, `.grad`. Pretendard 글꼴 파일(`fonts/`)이 없으면 시스템 글꼴로 대신 그린다.
- `assets/example-mask-headline.html`: 가장 짧은 완성 예시.
- `scripts/new-motion.mjs`: 새 모션 뼈대를 만든다.
- `scripts/render.cjs`: mp4나 정지 화면을 뽑는다(Playwright + ffmpeg).
- `references/techniques.md`: 기법 카탈로그. 작품 17편에서 쓴 수치(타이밍·곡선·간격)가 있다.
- `references/prompt-template.md`: 공통 규칙과 장면 시간표를 쓰는 틀.

## 만드는 순서

1. **요청을 장면 시간표로 바꾼다.** 크기(세로 1080×1920, 정사각 1080×1080), 길이, 장면별 시작·끝 초, 화면 문구를 정한다. 빠진 것이 결과를 바꿀 때만 한 번에 2~3개 묻고, 나머지는 `references/prompt-template.md`의 기본값으로 정한 뒤 무엇을 골랐는지 말한다.
2. **비슷한 기법을 찾는다.** `references/techniques.md`에서 가까운 작품을 찾아 수치를 출발점으로 쓴다(예: 헤드라인은 마스크 리빌 0.9초 + 줄 간격 0.18초).
3. **뼈대를 만든다.** `node scripts/new-motion.mjs <폴더> <slug> <가로> <세로> <초>`.
4. **`render(t)`를 채운다.** 지킬 규칙:
   - 상태를 쌓지 않는다. 같은 t에는 언제나 같은 그림. 이전 프레임 값, `Date.now()`, `Math.random()`을 쓰지 않는다. 무작위가 필요하면 `hash(n) = fract(sin(n·127.1+311.7)·43758.5453)`처럼 번호에서 만든다.
   - transform과 opacity만 움직인다. 등장은 ease-out, 장면 전환은 ease-in-out. `scale(0)`에서 시작하지 않는다.
   - 반복 모션은 끝에서 첫 프레임과 같은 상태로 돌아가게 한다.
   - 한국어는 `word-break: keep-all`, 숫자는 `font-variant-numeric: tabular-nums`.
   - 실제 데이터처럼 보이는 숫자(시세·통계)는 예시라고 주석에 밝히거나 넣지 않는다.
5. **확인한다.** 정지 화면을 3~4개 뽑아 직접 본다: `node scripts/render.cjs <파일> still 0.5,2,5`. 글자가 잘리거나 겹치는지, 장면 경계가 깜빡이지 않는지 본다.
6. **mp4로 뽑는다.** `node scripts/render.cjs <파일> out.mp4 30`. 용량을 줄이려면 `CRF=26`(기본 18). 필요한 것: `npm i playwright && npx playwright install chromium`, ffmpeg.

## 답할 때

- 완성한 HTML 파일과, 만든 경우 mp4·정지 화면을 함께 준다.
- 장면 시간표를 3~6줄로 요약하고, 고칠 때 바꿀 숫자(길이·간격·곡선)가 코드 어디에 있는지 짚는다.
- 남의 로고·캐릭터·브랜드 화면을 흉내 내지 않는다. 그림을 쓸 때는 사용자가 권리를 가진 파일만 쓴다.

## 출처

OIYO 쇼케이스 모션 갤러리(https://show.oiyo.net/motion/)의 계약과 도구를 그대로 옮겼다. 작품마다 프롬프트·라이브 데모·소스·mp4가 공개돼 있다.

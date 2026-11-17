# OIYO Skills

한국 세금·회계·노동·행정·등기·보험 문제와 경영 판단을 돕는 Claude 스킬 모음이에요. 스킬은 답하기 전에 결론을 바꾸는 질문부터 하고, 근거 조문·기한(D-day)·계산·무료 공공 창구를 붙여 답해요. 업계 종사자(세무·회계·노무·행정·등기·보험 실무자)와 일반인 모두 쓸 수 있어요.

> 이 스킬들은 자격사가 아니에요. 세무대리·노무 대리·행정 서류 작성 대행·등기 신청·손해사정·보험 모집을 하지 않고, 법령 정보와 계산까지만 해요. 각 자격법은 자격이 없는 사람이 자격 명칭(또는 비슷한 이름)을 쓰는 것을 금지해서, 스킬 이름에도 쓰지 않아요.

## 스킬 4종

| 스킬 | 누가 | 하는 일 |
| --- | --- | --- |
| [`oiyo-kr-law-guide`](skills/oiyo-kr-law-guide/SKILL.md) | 누구나 · 종사자 | 법령 길잡이 6분야(세금·회계·노동·행정·등기·보험). 선제 질문 → 기한·조문·서류·창구, 자격사 업무 범위 비교 |
| [`kr-tax-advisor`](skills/kr-tax-advisor/SKILL.md) | 세무·회계 실무자 | 비상장주식 평가, 가업상속공제, 법인전환, DCF 기업가치 계산과 상담 메모 |
| [`oiyo-kr-benefits-navigator`](skills/oiyo-kr-benefits-navigator/SKILL.md) | 누구나 | 근로장려금·출산휴가 급여·체불 대지급금·산재·실업급여 등 생활 지원금과 노동권 계산 |
| [`oiyo-business-strategist`](skills/oiyo-business-strategist/SKILL.md) | 경영자·실무자 | 경영 이론 40가지로 의사결정 메모, 한국 사업자 필수 일정, 운영 문제 점검 |

## 직업별 역량 지도

[COMPETENCIES.md](COMPETENCIES.md)에 세무사·공인회계사·공인노무사·행정사·법무사·보험계리사·손해사정사·보험설계사에게 필요한 역량을 7가지(법령 해석·계산·기한·서류·상담·업무 범위·전자 업무)로 나누고, 역량마다 쓸 수 있는 도구·MCP·스킬을 연결했어요. 웹 버전: https://tools.oiyo.net/ko/pro-competency-map/

## 설치

- **Claude 앱(claude.ai)**: [Releases](https://github.com/yuli3/oiyo-skills/releases/latest)에서 스킬별 zip을 받아 설정 → 기능 → 스킬에 올려요.
- **Claude Code**: 저장소를 받아 `skills/<이름>` 폴더를 `~/.claude/skills/`에 복사해요.
  ```sh
  git clone https://github.com/yuli3/oiyo-skills
  cp -r oiyo-skills/skills/oiyo-kr-law-guide ~/.claude/skills/
  ```
- 스킬 안의 `scripts/*.mjs`는 Node 22 이상에서 의존성 없이 돌아가요. 코드 실행이 안 되는 환경이면 MCP 서버 `https://api.oiyo.net/mcp`(MCP Registry `io.github.yuli3/oiyo-calculations`)를 쓰면 같은 계산을 해요.

## 원본과 갱신

스킬 원본은 tools.oiyo.net 계산기와 같은 엔진에서 생성돼요. 세법·최저임금·보험 규정이 바뀌면 원본을 고친 뒤 이 저장소로 옮기고, `main`에 올라오면 GitHub Actions가 스킬별 zip을 만들어 Releases에 올려요.

## 라이선스

스킬 설명·참고 문서와 스크립트는 [CC BY-NC 4.0](LICENSE)으로 제공해요. 출처("OIYO Skills — Oiyo Tech, https://github.com/yuli3/oiyo-skills")를 밝히면 비상업적으로 쓰고 고칠 수 있어요. OIYO 이름·로고는 포함되지 않아요. 상업적 이용 문의: support@oiyo.net

법령 정보이며 대리·자문이 아니에요. 원문과 담당 기관에서 확인하세요.

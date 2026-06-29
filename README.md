# 메리츠증권 경쟁사 광고 모니터링 대시보드

매일 10:00 / 15:00 KST에 7개 경쟁 증권사의 Meta + Google 활성 광고를 자동 수집해 KPI·갤러리 형태로 보여주는 대시보드.

## 모니터링 대상

| 구분 | 경쟁사 | Meta Page ID | Google Advertiser (Primary) |
|---|---|---|---|
| **클라이언트** | 메리츠증권 | _(미확인)_ | _(미확인)_ |
| 경쟁사 | 키움증권 | `131281780274622` | `AR16987959307796480001` |
| 경쟁사 | 미래에셋증권 | `170679759615120` | `AR11442509105290280961` |
| 경쟁사 | 삼성증권 | `319384881497144` | `AR11621934095679881217` |
| 경쟁사 | NH투자증권 | `130795396974886` | `AR04004909127795998721` |
| 경쟁사 | KB증권 | `526540400777484` | `AR07030169028924538881` |
| 경쟁사 | 토스증권 | `103399848375983` | `AR06938601451455250433` |
| 경쟁사 | 한국투자증권 | `306222562786526` | `AR14106116241651400705` |

> 메리츠증권 본인의 Meta page_id 및 Google advertiser_id는 확보 후 `config/competitors.json`에 추가

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 수집 | Playwright (헤드리스 Chromium) |
| 저장 | SQLite (`data/dashboard.sqlite`) |
| 대시보드 | Next.js 15 + Tailwind CSS + React 19 |
| 자동화 | GitHub Actions (평일 10:00 / 15:00 KST) |

## 디렉터리 구조

```
config/
  competitors.json           # 경쟁사 식별자 (Meta page_id, Google advertiser_id)
packages/
  db/                        # SQLite 스키마 + 시드 + DB 헬퍼
  collectors/
    src/google.mjs           # Google Ads Transparency 수집 (Playwright + RPC 가로채기)
    src/meta-scrape.mjs      # Meta Ad Library 수집 (Playwright, 토큰 불필요)
    src/meta.mjs             # Meta Ad Library 수집 (Graph API, 토큰 방식)
    src/export-json.mjs      # SQLite → JSON 내보내기 (대시보드 갱신)
  diff/
    src/run.mjs              # 최근 2 스냅샷 비교 (신규/종료 광고 추출)
  dashboard/                 # Next.js 앱 (포트 3300)
data/
  dashboard.sqlite           # 로컬 DB (gitignore)
```

## 로컬 실행

```bash
# 1. 의존성 설치
npm install
npx playwright install chromium

# 2. DB 초기화
npm run db:init

# 3. 광고 수집
npm run collect:meta       # Meta Ad Library (토큰 불필요)
npm run collect:google     # Google Ads Transparency

# 4. 대시보드용 JSON 내보내기
npm run export:json

# 5. 대시보드 실행
npm run dashboard:dev
# → http://localhost:3300
```

## 자동화 (GitHub Actions)

`.github/workflows/collect.yml`이 평일 오전 10시 / 오후 3시(KST)에 자동 실행됩니다.

수집 순서:
1. Google 수집 → 썸네일 enrichment
2. Meta 수집 → 썸네일 다운로드
3. JSON 내보내기
4. git commit & push → 대시보드 자동 갱신

## 메리츠증권 ID 추가 방법

메리츠증권 공식 Meta / Google 광고 계정이 생기면 아래 파일에 ID를 추가합니다.

**`config/competitors.json`**
```json
{
  "key": "meritz",
  "meta": { "page_id": "여기에_페이지_ID" },
  "google": { "advertiser_ids": ["AR..."] }
}
```

추가 후 `npm run db:init` 재실행.

## npm 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run db:init` | DB 스키마 초기화 + 경쟁사 시드 |
| `npm run collect:meta` | Meta Ad Library 스크래핑 |
| `npm run collect:google` | Google Ads Transparency 수집 |
| `npm run collect:all` | Meta + Google 순차 실행 |
| `npm run export:json` | DB → JSON 내보내기 (대시보드 반영) |
| `npm run diff` | 최근 2회 스냅샷 비교 |
| `npm run dashboard:dev` | 대시보드 개발 서버 (포트 3300) |
| `npm run enrich:google:v2` | Google 광고 썸네일 수집 |
| `npm run enrich:meta:thumbs` | Meta 광고 썸네일 다운로드 |

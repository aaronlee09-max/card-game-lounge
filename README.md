# 카드 게임 라운지

달의 고리 · 우노 · 블랙잭을 모은 웹 게임입니다.

서비스: https://webtronics.run.place/

## 화면

- `/`: 게임 선택 라운지
- `/moonring`: 달의 고리
- `/uno/`: 우노
- `/blackjack/`: 블랙잭
- `/lounge-install.html`: 라운지 앱 설치 및 통합 다운로드

게임별 앱 아이콘, PWA 설치 안내, 오프라인 HTML, iOS Web Clip 구성 프로파일을 포함합니다. 온라인 대전은 Cloudflare Worker와 D1 데이터베이스가 필요합니다. HTML 파일만 실행하면 온라인 매칭은 동작하지 않습니다.

## 빌드와 검사

Node.js에서 별도 패키지 설치 없이 빌드합니다.

```sh
node worker/build.mjs
node tests/review-regressions.mjs
node tests/full-moon.mjs
node tests/full-moon-lines.mjs
```

생성되는 Worker 진입점은 `dist/server/index.js`입니다. `dist`의 HTML·CSS·JavaScript·이미지는 Worker에 포함됩니다. `worker/build-offline.mjs`는 우노와 블랙잭의 단독 실행 HTML을 생성합니다.

## 배포

현재 서비스는 Sites에서 운영되며 `.openai/hosting.json`은 기존 Sites 프로젝트를 가리킵니다. 이 GitHub 저장소는 현재 소스 사본이며 자동 배포 연결은 설정하지 않았습니다.

독립적으로 배포하려면 Cloudflare Worker의 진입점을 `dist/server/index.js`로 설정하고 D1을 `DB` 이름으로 연결한 다음 `drizzle/0000_match_queue.sql`을 데이터베이스에 적용하세요. 다른 도메인으로 옮길 때는 소스의 `webtronics.run.place` 초대·프로파일 URL도 변경해야 합니다.

## 구성 프로파일

`dist/all-games.mobileconfig`는 라운지와 세 게임의 아이콘 4개를 추가합니다. 각 게임용 프로파일도 포함합니다. 최신 XML 프로파일의 Web Clip은 개별 삭제를 막고 프로파일 삭제로 제거하도록 설정되어 있습니다. 과거 `*-signed.mobileconfig`는 이전 서명본으로 최신 XML 설정과 다를 수 있습니다. 인증서 개인키는 포함하지 않습니다.

## 주요 소스

- `dist/app.js`: 달의 고리
- `dist/extra-games.js`, `dist/duel-rules.js`: 우노·블랙잭
- `dist/online-client.js`, `worker/online.js`: 대전 클라이언트·서버
- `dist/sw.js`, `dist/card-app-sw.js`: 오프라인 캐시
- `drizzle/`: 온라인 매칭 데이터베이스 스키마
- `tests/`: 게임 회귀 검사

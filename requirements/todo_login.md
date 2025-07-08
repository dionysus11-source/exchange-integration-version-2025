### 로그인 기능 추가 작업 계획

#### Phase 1: 백엔드 설정 및 구성

1.  **[Backend]** 사용자 인증 정보 파일 생성
    -   `monitor/backend/` 경로에 `users.json` 파일을 생성합니다.
    -   파일 형식: `[{"id": "user", "password": "password"}]`
2.  **[Backend]** 텔레그램 설정 파일 생성
    -   `monitor/backend/` 경로에 `telegram_config.json` 파일을 생성합니다.
    -   파일 형식: `{"telegramToken": "YOUR_TOKEN", "telegramChatId": "YOUR_CHAT_ID"}`
3.  **[Git]** 보안 설정 파일 `.gitignore`에 추가
    -   `monitor/backend/.gitignore` 파일(없으면 생성)에 `users.json`과 `telegram_config.json`을 추가하여 Git에 커밋되지 않도록 합니다.
4.  **[Backend]** JWT 라이브러리 추가
    -   `monitor/backend/requirements.txt`에 `PyJWT`를 추가하여 JWT(JSON Web Tokens) 생성을 위한 의존성을 설정합니다.

#### Phase 2: 백엔드 API 구현

5.  **[Backend]** 로그인 API 엔드포인트 구현
    -   `server.py`에 `/api/login` 엔드포인트를 추가합니다.
    -   이 엔드포인트는 `users.json`의 정보와 대조하여 사용자를 인증하고, 성공 시 JWT를 발급합니다.
6.  **[Backend]** 인증 미들웨어 구현
    -   `server.py`에 JWT를 검증하는 데코레이터 또는 미들웨어 함수를 구현합니다.
    -   보호가 필요한 모든 API 요청 헤더의 `Authorization` 토큰을 확인합니다.
7.  **[Backend]** API 엔드포인트 보호
    -   구현된 인증 미들웨어를 사용하여 `/api/investments`, `/api/ocr`, `/start` 등 모든 데이터 관련 엔드포인트를 보호합니다.
8.  **[Backend]** 모니터링 로직 수정
    -   `/start` 엔드포인트가 더 이상 요청 본문에서 텔레그램 정보를 받지 않고, 서버의 `telegram_config.json` 파일에서 직접 읽어오도록 수정합니다.

#### Phase 3: 프론트엔드 구현

9.  **[Frontend]** 로그인 페이지 생성
    -   `diary/src/app/login/page.tsx` 경로에 ID와 비밀번호를 입력받는 로그인 페이지를 생성합니다.
10. **[Frontend]** 전역 상태 관리 설정 (인증)
    -   `diary/src/context/AuthContext.tsx` 같은 파일을 생성하여 React Context API를 사용한 전역 인증 상태(로그인 여부, JWT 등)를 관리하는 로직을 구현합니다.
11. **[Frontend]** 인증 컨텍스트 적용
    -   `diary/src/app/layout.tsx`의 최상위 레벨을 `AuthContext` Provider로 감싸 앱 전체에서 인증 상태를 공유할 수 있도록 합니다.
12. **[Frontend]** 보호된 라우트 구현
    -   메인 페이지(`diary/src/app/page.tsx`)에 인증 상태를 확인하는 로직을 추가합니다. 비로그인 사용자는 `/login` 페이지로 리다이렉트시킵니다.
13. **[Frontend]** 로그인 기능 연동
    -   로그인 페이지에서 사용자가 입력한 정보로 `/api/login` API를 호출하고, 성공 시 반환된 JWT를 안전한 곳(예: `localStorage`)에 저장하고 `AuthContext` 상태를 업데이트합니다.
14. **[Frontend]** 인증 헤더 추가
    -   `axios` 또는 `fetch` 요청 시, 모든 인증이 필요한 API 호출에 `Authorization: Bearer <JWT>` 헤더가 포함되도록 설정합니다.
15. **[Frontend]** 모니터링 UI 수정
    -   `diary/src/components/ExchangeMonitor.tsx` 컴포넌트에서 텔레그램 토큰과 채팅 ID를 입력받는 폼 필드를 제거합니다.

#### Phase 4: 통합 및 테스트

16. **[Test]** 로그인/로그아웃 기능 테스트
17. **[Test]** 비로그인 사용자의 페이지 접근 제어(리다이렉트) 테스트
18. **[Test]** 로그인 사용자의 모든 기능(투자 기록, OCR, 모니터링) 정상 동작 테스트 
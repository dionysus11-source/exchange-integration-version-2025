# Python 백엔드 서버

Node.js 서버를 Python Flask로 변환한 환율 모니터링 서버입니다.

## 설치 및 실행

### 1. Python 가상환경 생성 (권장)
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 또는
venv\Scripts\activate     # Windows
```

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 서버 실행
```bash
python server.py
```

서버는 `http://localhost:3001`에서 실행됩니다.

## API 엔드포인트

### POST /start
모니터링을 시작합니다.

**요청 본문:**
```json
{
  "upperLimit": 1400,
  "lowerLimit": 1300,
  "telegramToken": "your-bot-token",
  "telegramChatId": "your-chat-id"
}
```

### POST /stop
모니터링을 중지합니다.

### GET /status
현재 모니터링 상태를 확인합니다.

### GET /rate
현재 환율을 조회합니다.

## 주요 변경사항

- **Express** → **Flask**
- **axios** → **requests**
- **cheerio** → **BeautifulSoup**
- **node-telegram-bot-api** → **python-telegram-bot**
- **setInterval** → **threading + time.sleep**

## 기능

1. 네이버 증권에서 USD/KRW 환율 실시간 조회
2. 설정한 상한/하한 값을 벗어날 때 텔레그램 알림
3. 60초 간격으로 환율 모니터링
4. REST API를 통한 모니터링 제어

## 참고사항

- 텔레그램 봇 토큰과 채팅 ID가 필요합니다.
- 모니터링은 백그라운드 스레드에서 실행됩니다.
- 기존 Node.js 서버(`server.js`)와 동일한 기능을 제공합니다. 
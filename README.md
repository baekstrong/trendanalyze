# 유튜브 트렌드 확인

키워드로 잘되는 유튜브 영상과 채널을 찾고, AI로 "왜 잘됐는지" 분석하는 도구예요.
**각자 자기 컴퓨터에 설치해서, 자기 계정(YouTube API 키, Claude 또는 ChatGPT 구독)으로** 쓰는 방식이에요.
서버에 올려 함께 쓰는 서비스가 아니라서 내 키와 데이터는 내 컴퓨터 밖으로 나가지 않아요.

## 할 수 있는 것

- **영상 찾기**: 키워드 검색, 조회수·구독자 대비 성과(기여도·성과도) 정렬, 쇼츠/롱폼 필터
- **채널 찾기 / 채널 분석**: 채널의 최근 영상 중 유독 잘된 영상 찾기
- **수집한 영상**: 마음에 드는 영상을 폴더별로 모아두기
- **AI 분석**: 시청층 추정, 썸네일 분석, 잘된 이유(제목·썸네일·자막 종합), 결과 패턴 요약, 키워드 확장, 댓글로 영상 아이디어 찾기, 새 영상 기획

검색 내역·수집 폴더·AI 결과는 브라우저에 저장돼서 같은 걸 다시 부를 때 API를 쓰지 않아요.

---

## 설치 순서 한눈에 보기

| 순서 | 할 일 | 꼭 필요? |
|---|---|---|
| 1 | 파이썬 설치 | 필수 |
| 2 | 이 프로젝트 받기 | 필수 |
| 3 | YouTube API 키 받기 | 필수 |
| 4 | Claude Code **또는** Codex 설치·로그인 | AI 분석을 쓸 때 (둘 중 하나만 있어도 됨) |
| 5 | yt-dlp 설치 | 선택 ("잘된 이유" 분석에 자막까지 넣고 싶을 때) |
| 6 | 실행 | 필수 |

---

## 1. 파이썬 설치

이미 깔려 있는지 먼저 확인해 보세요. 터미널(맥: `터미널` 앱, 윈도우: `PowerShell`)을 열고:

```bash
python3 --version
```

`Python 3.10` 이상이 나오면 다음 단계로 넘어가세요. (윈도우는 `python --version`으로 확인)

### 맥

1. https://www.python.org/downloads/ 에서 **Download Python** 버튼을 눌러 받습니다.
2. 받은 `.pkg` 파일을 열어 계속 → 설치를 누릅니다.
3. 터미널을 새로 열고 `python3 --version`으로 확인합니다.

Homebrew를 쓰고 있다면 이것만 해도 됩니다.

```bash
brew install python
```

### 윈도우

1. https://www.python.org/downloads/ 에서 **Download Python**을 받습니다.
2. 설치 첫 화면 아래쪽의 **Add python.exe to PATH**를 꼭 체크한 뒤 Install Now를 누릅니다.
3. PowerShell을 새로 열고 `python --version`으로 확인합니다.

> 윈도우에서는 이 문서의 `python3`를 전부 `python`으로 바꿔서 입력하세요.

추가로 설치할 파이썬 패키지는 없어요. 기본 기능만 써요.

---

## 2. 이 프로젝트 받기

**방법 A. 깃(git)을 쓸 줄 알면**

```bash
git clone https://github.com/baekstrong/trendanalyze.git
```

```bash
cd trendanalyze
```

**방법 B. 깃을 모르면**

GitHub 저장소 페이지에서 초록색 **Code** 버튼 → **Download ZIP**을 누르고, 받은 압축 파일을 원하는 곳에 풉니다.

---

## 3. YouTube API 키 받기

영상 검색에는 Google의 **YouTube Data API v3** 키가 필요해요. 무료이고, 각자 자기 Google 계정으로 받습니다.

1. https://console.cloud.google.com/ 에 Google 계정으로 로그인합니다.
2. 맨 위 프로젝트 선택 메뉴 → **새 프로젝트** → 이름(예: `youtube-trend`)을 넣고 **만들기**.
3. 만든 프로젝트가 선택된 상태에서 왼쪽 메뉴 **API 및 서비스 → 라이브러리**로 갑니다.
4. `YouTube Data API v3`를 검색해서 들어간 뒤 **사용**을 누릅니다.
5. **API 및 서비스 → 사용자 인증 정보** → 위쪽 **+ 사용자 인증 정보 만들기 → API 키**를 누릅니다.
6. 만들어진 키(`AIza...`로 시작)를 복사해 둡니다.
7. (권장) 키 옆의 **수정** → **API 제한사항**에서 **키 제한**을 고르고 `YouTube Data API v3`만 체크한 뒤 저장합니다. 키가 새도 다른 곳에 못 쓰게 막아 줘요.

**알아두기**
- 하루 무료 사용량은 **10,000 유닛**이에요. 검색 한 번(50개)에 약 100유닛이 들어서, 하루에 검색을 수십 번 할 수 있어요. 화면 위쪽에 오늘 쓴 양이 대략 표시돼요.
- 사용량은 미국 태평양 시간 자정(한국 시간 오후 4~5시)에 초기화돼요.
- 키는 다른 사람과 공유하지 마세요. 공유하면 그 사람 사용량까지 내 한도에서 빠져요.

---

## 4. AI 분석 준비 (Claude Code 또는 Codex)

AI 분석은 이 컴퓨터에 **로그인된 Claude Code 또는 Codex를 통해 각자 구독으로** 돌아가요. 별도의 AI API 키는 필요 없어요.
둘 중 쓰는 것 하나만 설치하면 되고, 둘 다 있으면 화면 오른쪽 위 **AI: Claude Code / AI: Codex** 메뉴로 바꿔 쓸 수 있어요.

| | Claude Code | Codex |
|---|---|---|
| 필요한 구독 | Claude Pro 또는 Max (claude.ai) | ChatGPT Plus·Pro·Business 등 (chatgpt.com) |
| 기본 모델 | Claude Opus 5.5 | Codex 설정의 기본 모델 |
| 사용량 | 내 Claude 구독 한도에서 차감 | 내 ChatGPT 구독 한도에서 차감 |

### 4-A. Claude Code를 쓰는 경우

**설치**

맥 (터미널):

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

윈도우 (PowerShell):

```powershell
irm https://claude.ai/install.ps1 | iex
```

**로그인**

```bash
claude
```

처음 실행하면 브라우저가 열려요. **Claude 구독 계정(Pro/Max)** 으로 로그인하고, 로그인이 끝나면 `/exit`를 입력해 나오면 됩니다.
제대로 됐는지는 아래 명령으로 확인할 수 있어요. 답이 나오면 준비 완료예요.

```bash
claude -p "안녕"
```

### 4-B. Codex를 쓰는 경우 (ChatGPT 구독자)

**설치** (둘 중 하나)

Node.js가 있으면:

```bash
npm install -g @openai/codex
```

맥에서 Homebrew를 쓰면:

```bash
brew install --cask codex
```

> Node.js가 없다면 https://nodejs.org/ 에서 LTS 버전을 먼저 설치하세요.

**로그인**

```bash
codex
```

처음 실행하면 로그인 방법을 물어요. **Sign in with ChatGPT**를 고르고 브라우저에서 내 ChatGPT 계정으로 로그인한 뒤, `/quit`으로 나오면 됩니다.
확인:

```bash
codex exec --skip-git-repo-check "안녕"
```

**화면에서 Codex로 바꾸기**

앱을 연 뒤 오른쪽 위 메뉴에서 **AI: Codex**를 고르면 그다음 분석부터 Codex로 돌아가요. 고른 값은 브라우저에 기억돼요.

> Codex는 내 Codex 설정(`~/.codex/config.toml`)의 기본 모델과 추론 강도를 그대로 써요. 추론 강도를 아주 높게 해 두면 분석 한 번에 몇 분씩 걸릴 수 있어요.

---

## 5. yt-dlp 설치 (선택)

"잘된 이유" 분석은 영상의 자동 자막까지 읽고 첫 30초 훅과 전개를 분석해요. 자막을 받으려면 `yt-dlp`가 필요해요.
없어도 분석은 되고, 그때는 제목·썸네일·설명·댓글만 보고 분석해요.

맥:

```bash
brew install yt-dlp
```

윈도우:

```powershell
winget install yt-dlp
```

또는 (맥·윈도우 공통):

```bash
python3 -m pip install yt-dlp
```

---

## 6. 실행

프로젝트 폴더에서:

```bash
python3 server.py
```

`http://localhost:5178 을 브라우저로 여세요` 라는 문구가 나오면, 브라우저에서 http://localhost:5178 을 엽니다.

1. 오른쪽 위 **YouTube API 키** 칸에 3번에서 받은 키를 붙여 넣습니다. (브라우저에 저장돼서 다음부터는 안 넣어도 돼요)
2. **AI** 메뉴에서 Claude Code 또는 Codex를 고릅니다.
3. 키워드를 넣고 검색해 보세요. 영상을 누르면 상세 패널에서 AI 분석을 쓸 수 있어요.

끌 때는 터미널에서 `Ctrl + C`를 누르세요. 다음에 쓸 때는 6번만 다시 하면 됩니다.

> `index.html`을 더블클릭해서 열면 검색은 되지만 AI 분석은 안 돼요. AI를 쓰려면 꼭 `python3 server.py`로 띄운 주소로 여세요.

---

## 내 입맛대로 고쳐 쓰기

자유롭게 고쳐 써도 돼요. 코드를 몰라도 Claude Code나 Codex에게 부탁하면 됩니다.

```bash
cd trendanalyze
```

```bash
claude
```

(Codex라면 `codex`) 를 실행한 뒤 "검색 결과에 좋아요 수 열도 보여줘"처럼 말로 요청하면 돼요.

**자주 바꾸는 설정**

| 바꾸고 싶은 것 | 방법 |
|---|---|
| Claude 모델 | 실행할 때 `TREND_AI_MODEL=claude-sonnet-5-5 python3 server.py` |
| Codex 모델 | 실행할 때 `TREND_CODEX_MODEL=모델이름 python3 server.py` (비우면 Codex 기본값) |
| AI 분석 질문 내용 | `server.py`의 `TASKS` |
| 화면·표 | `index.html`, `channels.js` |
| 기여도·성과도 계산식 | `metrics.js` |

고친 뒤에는 터미널에서 `Ctrl + C`로 끄고 `python3 server.py`로 다시 켜면 반영돼요.

원본이 업데이트되면 받아오기 (git으로 받은 경우):

```bash
git pull
```

내가 고친 부분과 겹치면 충돌이 날 수 있어요. 그럴 땐 Claude Code나 Codex에게 "git pull 충돌 해결해줘"라고 부탁하세요.

---

## 문제 해결

| 증상 | 해결 |
|---|---|
| `command not found: python3` | 1번 파이썬 설치를 다시 확인. 윈도우는 `python`으로 입력 |
| 검색 시 `API key not valid` | 키를 다시 복사해 넣기, 3-4번 "사용"을 눌렀는지 확인 |
| 검색 시 `quota` 관련 오류 | 오늘 사용량 소진. 한국 시간 오후 4~5시 이후 다시 시도 |
| AI: `Claude Code가 설치돼 있지 않아요` | 4-A 설치 후, 터미널을 새로 열고 `python3 server.py`를 다시 실행 |
| AI: `Codex가 설치돼 있지 않아요` | 4-B 설치 후 서버 재실행 |
| AI: 로그인·인증 관련 오류 | 터미널에서 `claude` 또는 `codex`를 실행해 다시 로그인 |
| AI: 사용량 한도 오류 | 구독 한도 소진. 시간이 지나 초기화된 뒤 다시 시도하거나 다른 AI로 바꾸기 |
| "잘된 이유"에 자막 없이 분석했다고 나옴 | 5번 yt-dlp 설치. 자막이 없는 영상일 수도 있어요 |
| `Address already in use` | 서버가 이미 켜져 있어요. 열려 있는 터미널을 찾아 `Ctrl + C` 후 다시 실행 |

---

## 보안·개인정보

- 서버는 **내 컴퓨터 안에서만**(`127.0.0.1`) 열려서 같은 와이파이의 다른 사람도 접속할 수 없어요.
- 다른 웹사이트가 이 서버로 몰래 AI 요청을 보내 내 구독을 쓰지 못하게 막아 두었어요.
- YouTube 키·검색 내역·AI 결과는 내 브라우저에만 저장돼요. 다른 사람과 컴퓨터를 같이 쓴다면 키 입력칸을 비워 두세요.
- AI에 보내는 건 영상 제목·설명·태그·댓글·썸네일·자막 같은 공개 정보뿐이에요.

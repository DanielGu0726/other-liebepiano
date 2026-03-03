# 리베 피아노 갤러리 시스템

Cloudflare D1 (데이터베이스)와 R2 (스토리지)를 사용한 갤러리 시스템입니다.

## 🎯 구성 요소

1. **Cloudflare Worker API** (`gallery-api/`)
   - D1 데이터베이스: `liebe-piano-gallery-db`
   - R2 버킷: `liebe-piano-images`
   - API URL: https://liebe-piano-gallery.tjmds99.workers.dev

2. **갤러리 페이지** (`gallery.html`)
   - 모든 방문자가 볼 수 있는 공개 갤러리
   - 이미지 클릭 시 라이트박스로 크게 보기

3. **관리자 페이지** (`admin.html`)
   - 이미지 업로드 및 삭제 기능
   - 비밀번호: `liebe2026admin`

## 📝 사용 방법

### 갤러리 보기
1. 웹사이트 메뉴에서 "갤러리" 클릭
2. 또는 직접 `gallery.html` 접속

### 이미지 업로드
1. `admin.html` 접속
2. 비밀번호 입력: `liebe2026admin`
3. 이미지 선택 (클릭하여 파일 선택)
4. 제목과 설명 입력 (선택사항)
5. "업로드" 버튼 클릭

### 이미지 삭제
1. Admin 페이지 하단 "업로드된 이미지" 섹션에서
2. 삭제하려는 이미지의 "삭제" 버튼 클릭

## 🔒 보안 안내

### 중요: API 토큰 재생성 필요!
작업에 사용된 API 토큰은 보안을 위해 **반드시 삭제하고 새로 생성**하세요:

1. Cloudflare 대시보드 접속: https://dash.cloudflare.com
2. My Profile → API Tokens
3. 기존 토큰 삭제
4. 필요시 새 토큰 생성

### 관리자 비밀번호 변경
기본 비밀번호를 변경하려면:

1. `gallery-api/wrangler.toml` 파일 수정:
   ```toml
   [vars]
   ADMIN_PASSWORD = "새로운비밀번호"
   ```

2. Worker 재배포:
   ```bash
   cd gallery-api
   wrangler deploy
   ```

## 💰 비용 안내

### 무료 플랜 한도
- **D1 데이터베이스**
  - 읽기: 500만 rows/일
  - 쓰기: 10만 rows/일
  - 스토리지: 5GB

- **R2 스토리지**
  - 저장: 10GB
  - Class A 작업: 100만/월 (업로드)
  - Class B 작업: 1000만/월 (다운로드)

중소규모 갤러리는 무료 플랜으로 충분히 운영 가능합니다!

## 🛠️ 개발자 정보

### Worker 재배포
코드를 수정한 후:
```bash
cd gallery-api
export CLOUDFLARE_API_TOKEN="새로운토큰"
wrangler deploy
```

### 데이터베이스 조회
```bash
cd gallery-api
wrangler d1 execute liebe-piano-gallery-db --remote --command "SELECT * FROM gallery_images"
```

### 로컬 개발
```bash
cd gallery-api
wrangler dev
```

## 📂 파일 구조
```
3. Liebe piano/
├── index.html          # 메인 페이지
├── gallery.html        # 갤러리 페이지
├── admin.html          # 관리자 페이지
├── style.css           # 스타일시트
├── script.js           # 스크립트
├── images/             # 로컬 이미지
│   └── hero.mp4
└── gallery-api/        # Cloudflare Worker
    ├── wrangler.toml   # Worker 설정
    ├── schema.sql      # DB 스키마
    └── src/
        └── index.js    # API 코드
```

## 🎨 기능

- ✅ 이미지 업로드/삭제
- ✅ 제목 및 설명 추가
- ✅ 반응형 갤러리 그리드
- ✅ 라이트박스 이미지 뷰어
- ✅ 관리자 인증
- ✅ 모바일 최적화

## 📞 문의

문제가 있거나 도움이 필요하시면 Cloudflare Workers 문서를 참조하세요:
- https://developers.cloudflare.com/workers/
- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/r2/

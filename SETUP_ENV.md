# 환경 변수 설정 가이드

## .env 파일 생성

1. 프로젝트 루트 디렉토리에서 `.env.example` 파일을 `.env`로 복사하세요:
   ```bash
   # Windows (PowerShell)
   Copy-Item .env.example .env
   
   # macOS/Linux
   cp .env.example .env
   ```

2. `.env` 파일을 열고 `GOOGLE_CLIENT_SECRET` 값을 입력하세요:
   ```env
   GOOGLE_CLIENT_SECRET=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
   ```

## 주의사항

- **절대 `.env` 파일을 Git에 커밋하지 마세요.**
- `.gitignore`에 `.env` 파일이 포함되어 있습니다.
- `.env` 파일은 코드가 실행되는 환경에만 존재해야 합니다.
- 다른 개발자와 공유하지 마세요.

## 확인

`.env` 파일이 올바르게 설정되었는지 확인하려면 앱을 실행하고 콘솔을 확인하세요. 
환경 변수가 제대로 로드되지 않으면 오류 메시지가 표시됩니다.










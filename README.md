# iPhone 재현 웹사이트

## 바로 실행 (내 컴퓨터)
Node.js(18 이상, https://nodejs.org LTS)만 설치되어 있으면 됩니다.

- **Windows**: `start.bat` 더블클릭
- **Mac**: `start.command` 더블클릭 (막히면 터미널에서 `bash start.command`)
- **터미널**: `npm install` → `npm start`

처음 실행하면 관리자 비밀번호를 물어보고(엔터 = 자동 생성) `.env` 를 만듭니다. 이후 주소가 표시됩니다.
- 보기: `http://localhost:3000` → 비밀번호 `0912`
- 편집: `http://localhost:3000/?admin` → 우측 상단 「관리자」 → 로그인 → 탭별 편집 → 「저장」
- 같은 Wi-Fi 의 폰에서는 표시된 `http://192.168.x.x:3000` 으로 접속.
- 사진·대화는 `data/` 폴더에 저장됩니다(백업은 이 폴더를 복사).

## 인터넷에 배포 (Vercel)
1. 저장소를 Vercel 에 Import (Framework: Vite) 또는 폴더에서 `npx vercel`.
2. Storage 탭 → **Blob**(Public store) 생성/연결, **Upstash Redis**(Marketplace) 생성/연결.
3. 환경변수 `ADMIN_PASSWORD`, `SESSION_SECRET`(32자+) 등록 후 재배포(`npx vercel --prod`).
4. 관리자 진입: `https://<도메인>/?admin`.
(Redis/Blob 환경변수가 있으면 자동으로 클라우드 저장소를, 없으면 로컬 `data/` 를 사용합니다.)

## GitHub 에 올리기
`git remote add origin https://github.com/<계정>/<저장소>.git && git push -u origin main`
(`.env*`, `data/` 는 `.gitignore` 로 제외되어 비밀 값·개인 사진이 올라가지 않습니다.)

## 보안 구조
- 관리자 비밀번호는 서버 환경변수/`.env` 에만 존재. 로그인 시 HMAC 서명된 HttpOnly·SameSite=Strict 쿠키 발급(7일, Vercel 에서는 Secure 추가).
- `PUT /api/content`, `POST /api/upload` 는 서버에서 쿠키 검증 후에만 동작. GET 은 공개(열람 전용).
- 로그인 시도 IP당 10분 10회 제한. 업로드는 이미지/오디오 MIME 화이트리스트, 4.4MB 제한.
- 잠금화면 비밀번호(0912)는 연출용으로 화면에서 확인합니다.

## 기타
- 수신 전화: 최초 접속(브라우저 탭 세션) 180초 뒤 1회. 이름·사진·음성은 「수신전화」 탭에서 설정.
- 사진은 업로드 시 자동으로 긴 변 1600px JPEG 로 줄여 저장. 음성 파일은 4.4MB 이하.

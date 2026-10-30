# 📸 우리 학교 4컷 사진관

학교 행사에서 태블릿으로 사진을 찍고, 포토프린터(Canon SELPHY 등)로 바로 인쇄하는 4컷 사진 웹앱입니다.

## 사용 흐름

1. **사진 촬영하기** → 카운트다운(3-2-1)과 함께 사진 6장을 연속 촬영
2. **사진 고르기** → 6장 중 마음에 드는 4장 선택
3. **프레임 고르기** → 관리자 페이지에서 "사용"으로 켜 둔 프레임 중 선택
4. **인쇄하기** → 10×15cm(100×148mm) 엽서 크기로 인쇄
5. 인쇄 버튼을 누르고 **2분이 지나면** 사진이 지워지고 자동으로 처음 화면으로 돌아갑니다.

사진은 서버에 올라가지 않고 태블릿 화면 안에서만 만들어집니다.

## 권장 사용 환경

- 태블릿 **세로 화면**
- 인쇄 창 설정: 용지 **엽서(100×148mm)**, 여백 **없음**, 배율 **100%**

## 프레임 관리 (`/admin`)

사이트 주소 뒤에 `/admin`을 붙이면 관리자 페이지가 열립니다.

- 프레임 이름, 사용/숨김, 표시 순서를 바꾼 뒤 **관리자 비밀번호**를 넣고 저장합니다.
- 저장하면 `public/frames/frames.json`이 GitHub에 자동으로 커밋되고, Vercel이 1~2분 뒤 다시 배포합니다.

### 새 프레임 추가하기

1. 1000×1480px 크기의 프레임 그림을 `public/frames/` 폴더에 넣습니다.
2. `public/frames/frames.json`에 항목을 추가합니다. (`id`, `name`, `enabled`, `sortOrder`, `image`)

사진 4칸은 그림 위쪽 가운데(대략 가로 115~885px, 세로 258~1042px)에 놓이므로, 이 부분은 비워 두고 디자인하면 좋습니다.

## Vercel 환경변수

| 이름 | 내용 |
| --- | --- |
| `ADMIN_PASSWORD` | 관리자 페이지 저장 비밀번호 |
| `GITHUB_TOKEN` | 저장소 쓰기 권한(Contents: Read and write)이 있는 GitHub 토큰 |
| `GITHUB_REPOSITORY` | `skypjh5317-yoon/fourcut-photo` |
| `GITHUB_BRANCH` | (선택) 저장할 브랜치, 기본값 `main` |

환경변수를 바꾼 뒤에는 **다시 배포(Redeploy)** 해야 적용됩니다.
GitHub 토큰은 만료일이 있으니, 행사 전에 GitHub의 Developer settings → Personal access tokens에서 만료일을 확인하세요.

## 개발

```bash
npm install
npm run dev     # 개발 서버
npm run build   # 배포용 빌드
```

React + TypeScript + Vite로 만들었고 Vercel에 배포합니다.

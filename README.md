# Nano Pro

AI 콘텐츠 생성 웹 애플리케이션. 이미지, 비디오, 음성, 시나리오 아이디어까지 하나의 인터페이스에서 생성할 수 있습니다.

## 기능

| 탭 | 설명 | 모델 |
|---|---|---|
| 🎨 이미지 생성 | 텍스트/참조 이미지 기반 이미지 생성 | Gemini Pro |
| 🗣️ 음성 생성 | 텍스트를 자연스러운 음성으로 변환 (TTS) | Gemini TTS |
| 🎬 비디오 생성 | 프롬프트 기반 비디오 생성 | Veo 3.1 |
| 🎥 Kling 비디오 | Kling AI 기반 비디오 생성 | Kling AI |
| 🎭 모션 컨트롤 | 모션 제어 비디오 생성 | Kling Motion |
| 💡 아이디어챗 | 대화형 콘텐츠 시나리오 기획 | Gemini 3 Flash |

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **AI SDK**: @google/genai
- **배포**: Vercel

## 시작하기

### 환경 변수

`.env.local` 파일을 생성하고 다음 키를 설정하세요:

```env
GOOGLE_API_KEY=your_google_api_key
KLING_ACCESS_KEY=your_kling_access_key
KLING_SECRET_KEY=your_kling_secret_key
```

### 설치 및 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
app/
├── api/
│   ├── generate-image/    # 이미지 생성 API
│   ├── generate-tts/      # TTS API
│   ├── generate-video/    # Veo 비디오 생성 API
│   ├── check-video/       # 비디오 상태 확인 API
│   ├── kling-video/       # Kling 비디오 생성 API
│   ├── kling-status/      # Kling 상태 확인 API
│   ├── motion-control/    # 모션 컨트롤 API
│   ├── motion-status/     # 모션 상태 확인 API
│   └── idea-chat/         # 아이디어챗 스트리밍 API
├── components/
│   ├── ImageGenerator.tsx
│   ├── TTSGenerator.tsx
│   ├── VideoGenerator.tsx
│   ├── KlingVideoGenerator.tsx
│   ├── MotionControl.tsx
│   └── IdeaChat.tsx
├── layout.tsx
└── page.tsx
```

## 배포

Vercel에 배포할 수 있습니다. 환경 변수를 Vercel 프로젝트 설정에 추가하세요.

## 라이선스

Private

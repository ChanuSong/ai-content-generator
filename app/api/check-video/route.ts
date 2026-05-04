import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const operationName = body.operationName || body.operation?.name;

    if (!operationName) {
      return NextResponse.json({ error: "operationName이 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
    );
    const operation = await res.json();

    if (operation.error) {
      return NextResponse.json({
        done: true,
        error: operation.error.message || "API 오류",
      });
    }

    if (!operation.done) {
      return NextResponse.json({
        done: false,
        message: "비디오 생성 중...",
      });
    }

    const generateVideoResponse = operation.response?.generateVideoResponse;

    if (generateVideoResponse?.raiMediaFilteredCount > 0) {
      return NextResponse.json({
        done: true,
        error: `콘텐츠 안전 필터에 의해 비디오가 차단되었습니다. (${generateVideoResponse.raiMediaFilteredCount}건 필터링)`,
      });
    }

    const samples = generateVideoResponse?.generatedSamples;
    const videoUri = samples?.[0]?.video?.uri;

    if (videoUri) {
      // Return a same-origin streaming proxy URL instead of inlining the
      // video as base64. Vercel's serverless response payload limit (~4.5MB)
      // would otherwise reject Veo mp4s, which routinely exceed that size.
      return NextResponse.json({
        done: true,
        videoUrl: `/api/video-stream?op=${encodeURIComponent(operationName)}`,
        message: "비디오 생성 완료!",
      });
    }

    const debugInfo = {
      responseKeys: Object.keys(operation.response || {}),
      generateVideoResponseKeys: generateVideoResponse ? Object.keys(generateVideoResponse) : null,
      samplesLength: samples?.length ?? null,
      firstSampleKeys: samples?.[0] ? Object.keys(samples[0]) : null,
      firstVideoKeys: samples?.[0]?.video ? Object.keys(samples[0].video) : null,
    };
    console.error("Veo extraction failed. Debug:", JSON.stringify(debugInfo, null, 2));
    console.error("Full operation:", JSON.stringify(operation, null, 2));

    return NextResponse.json({
      done: true,
      error: `비디오 결과 추출 실패. 디버그: ${JSON.stringify(debugInfo)}`,
    });
  } catch (error) {
    console.error("Check video error:", error);
    return NextResponse.json(
      { error: `상태 확인 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

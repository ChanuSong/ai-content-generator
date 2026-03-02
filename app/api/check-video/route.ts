import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const operationName = body.operationName || body.operation?.name;

    if (!operationName) {
      return NextResponse.json({ error: "operationName이 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    // Direct REST call to Google API (bypasses SDK class instantiation issues)
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

    // Operation complete - extract video
    // REST API path: response.generateVideoResponse.generatedSamples[].video.uri
    const generateVideoResponse = operation.response?.generateVideoResponse;
    const samples = generateVideoResponse?.generatedSamples;

    if (samples?.length > 0) {
      const videoUri = samples[0]?.video?.uri;

      if (videoUri) {
        // Video URI requires API key header for download
        const videoResponse = await fetch(videoUri, {
          headers: { "x-goog-api-key": apiKey },
        });
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoBuffer).toString("base64");

        return NextResponse.json({
          done: true,
          video: `data:video/mp4;base64,${videoBase64}`,
          message: "비디오 생성 완료!",
        });
      }
    }

    // Return debug info if extraction fails
    console.error("Veo response structure:", JSON.stringify(operation, null, 2));
    return NextResponse.json({
      done: true,
      error: `비디오 결과 추출 실패. 응답 구조: ${JSON.stringify(Object.keys(operation.response || {}))}`,
    });
  } catch (error) {
    console.error("Check video error:", error);
    return NextResponse.json(
      { error: `상태 확인 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

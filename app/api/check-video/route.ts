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
    // REST API (mldev) path: response.generateVideoResponse.generatedSamples[].video.uri
    const generateVideoResponse = operation.response?.generateVideoResponse;

    // Check for content safety filtering
    if (generateVideoResponse?.raiMediaFilteredCount > 0) {
      return NextResponse.json({
        done: true,
        error: `콘텐츠 안전 필터에 의해 비디오가 차단되었습니다. (${generateVideoResponse.raiMediaFilteredCount}건 필터링)`,
      });
    }

    const samples = generateVideoResponse?.generatedSamples;

    if (samples?.length > 0) {
      const videoUri = samples[0]?.video?.uri;

      if (videoUri) {
        // Video URI requires API key header for download
        const videoResponse = await fetch(videoUri, {
          headers: { "x-goog-api-key": apiKey },
        });

        if (!videoResponse.ok) {
          return NextResponse.json({
            done: true,
            error: `비디오 다운로드 실패: ${videoResponse.status} ${videoResponse.statusText}`,
          });
        }

        const videoBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoBuffer).toString("base64");

        return NextResponse.json({
          done: true,
          video: `data:video/mp4;base64,${videoBase64}`,
          message: "비디오 생성 완료!",
        });
      }
    }

    // Extraction failed - return detailed debug info
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

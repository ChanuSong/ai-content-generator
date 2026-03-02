import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "taskId가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.KLING_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "KLING_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const response = await fetch(
      `https://api.piapi.ai/api/v1/task/${taskId}`,
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();
    const status = result?.data?.status?.toLowerCase();

    if (status === "completed") {
      const videoUrl =
        result.data.output?.works?.[0]?.video?.resource_without_watermark ||
        result.data.output?.works?.[0]?.video?.resource ||
        "";

      return NextResponse.json({
        done: true,
        videoUrl,
        message: "Kling 비디오 생성 완료!",
      });
    }

    if (status === "failed") {
      return NextResponse.json({
        done: true,
        error: `작업 실패: ${JSON.stringify(result.data)}`,
      });
    }

    return NextResponse.json({
      done: false,
      status,
      message: `상태: ${status}`,
    });
  } catch (error) {
    console.error("Kling status error:", error);
    return NextResponse.json(
      { error: `상태 확인 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

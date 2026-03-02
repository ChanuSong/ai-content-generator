import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { operationName } = await req.json();

    if (!operationName) {
      return NextResponse.json({ error: "operationName이 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const operation = await ai.operations.getVideosOperation({ operation: operationName });

    if (!operation.done) {
      return NextResponse.json({
        done: false,
        message: "비디오 생성 중...",
      });
    }

    // Operation complete - extract video
    const videos = operation.response?.generatedVideos;
    if (videos && videos.length > 0) {
      const video = videos[0].video;
      if (video?.uri) {
        const videoResponse = await fetch(video.uri);
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoBuffer).toString("base64");

        return NextResponse.json({
          done: true,
          video: `data:video/mp4;base64,${videoBase64}`,
          message: "비디오 생성 완료!",
        });
      }
    }

    return NextResponse.json({
      done: true,
      error: "비디오 생성 결과를 가져올 수 없습니다.",
    });
  } catch (error) {
    console.error("Check video error:", error);
    return NextResponse.json(
      { error: `상태 확인 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

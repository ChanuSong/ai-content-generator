import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = (formData.get("aspectRatio") as string) || "9:16";
    const duration = parseInt(formData.get("duration") as string) || 8;
    const quality = (formData.get("quality") as string) || "720p";
    const startFrameFile = formData.get("startFrame") as File | null;
    const endFrameFile = formData.get("endFrame") as File | null;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });
    }
    if (!startFrameFile) {
      return NextResponse.json({ error: "시작 프레임을 업로드해주세요." }, { status: 400 });
    }

    // End frame requires 720p and 8 seconds
    if (endFrameFile && (quality !== "720p" || duration !== 8)) {
      return NextResponse.json(
        { error: "끝 프레임 사용 시 720p / 8초만 지원됩니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    // High-quality requires 8 seconds
    if ((quality === "1080p" || quality === "4K") && duration !== 8) {
      return NextResponse.json(
        { error: `${quality} 화질은 8초 길이만 지원합니다.` },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Read start frame
    const startFrameBuffer = await startFrameFile.arrayBuffer();
    const startFrameBase64 = Buffer.from(startFrameBuffer).toString("base64");

    const image = {
      imageBytes: startFrameBase64,
      mimeType: startFrameFile.type || "image/png",
    };

    const resolution = quality === "4K" ? "4k" : quality;

    // Read end frame if provided
    let lastFrameImage;
    if (endFrameFile) {
      const endFrameBuffer = await endFrameFile.arrayBuffer();
      const endFrameBase64 = Buffer.from(endFrameBuffer).toString("base64");
      lastFrameImage = {
        imageBytes: endFrameBase64,
        mimeType: endFrameFile.type || "image/png",
      };
    }

    // Start video generation (returns an operation for polling)
    const operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt,
      image,
      config: {
        aspectRatio,
        durationSeconds: duration,
        resolution,
        ...(lastFrameImage && { lastFrame: lastFrameImage }),
      },
    });

    if (!operation.name) {
      console.error("Veo operation missing name:", JSON.stringify(operation, null, 2));
      return NextResponse.json(
        { error: "비디오 생성 작업 이름을 받지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      operationName: operation.name,
      message: "비디오 생성이 시작되었습니다.",
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: `비디오 생성 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

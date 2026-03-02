import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = (formData.get("aspectRatio") as string) || "9:16";
    const imageSize = (formData.get("imageSize") as string) || "2K";

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build contents array with prompt and optional reference images
    const contents: Array<
      | string
      | { inlineData: { mimeType: string; data: string } }
    > = [prompt];

    const imageFiles = formData.getAll("images");
    for (const file of imageFiles) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        contents.push({
          inlineData: {
            mimeType: file.type || "image/png",
            data: base64,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    // Extract image parts
    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          images.push(
            `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`
          );
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "이미지 생성에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: `이미지 생성 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

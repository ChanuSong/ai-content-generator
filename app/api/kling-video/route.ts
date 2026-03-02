import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

async function uploadToHost(buffer: Buffer, filename: string): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  // Upload to 0x0.st
  const formData = new FormData();
  formData.append("file", new Blob([uint8]), filename);

  const response = await fetch("https://0x0.st", {
    method: "POST",
    body: formData,
    headers: { "User-Agent": "curl/7.79.1" },
  });

  if (!response.ok) {
    // Fallback to catbox
    const catboxForm = new FormData();
    catboxForm.append("reqtype", "fileupload");
    catboxForm.append("fileToUpload", new Blob([uint8]), filename);

    const catboxResponse = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catboxForm,
    });

    const catboxUrl = await catboxResponse.text();
    if (!catboxUrl.startsWith("http")) {
      throw new Error("All upload hosts failed");
    }
    return catboxUrl.trim();
  }

  const url = await response.text();
  if (!url.startsWith("http")) {
    throw new Error(`Upload failed: ${url}`);
  }
  return url.trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File | null;
    const duration = parseInt(formData.get("duration") as string) || 5;
    const aspectRatio = (formData.get("aspectRatio") as string) || "16:9";
    const negativePrompt =
      (formData.get("negativePrompt") as string) ||
      "text, watermark, logo, lowres";
    const cfgScale = parseFloat(formData.get("cfgScale") as string) || 0.5;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });
    }
    if (!imageFile) {
      return NextResponse.json({ error: "이미지를 업로드해주세요." }, { status: 400 });
    }

    const apiKey = process.env.KLING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "KLING_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Upload image to external host
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageUrl = await uploadToHost(imageBuffer, "image.png");

    // Create Kling video task
    const response = await fetch("https://api.piapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling",
        task_type: "video_generation",
        input: {
          prompt,
          negative_prompt: negativePrompt,
          cfg_scale: cfgScale,
          duration,
          mode: "std",
          image_url: imageUrl,
          aspect_ratio: aspectRatio,
        },
        config: { service_mode: "public" },
      }),
    });

    const result = await response.json();
    const taskId = result?.data?.task_id;

    if (!taskId) {
      return NextResponse.json(
        { error: `작업 생성 실패: ${JSON.stringify(result)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId,
      message: "Kling 비디오 생성이 시작되었습니다.",
    });
  } catch (error) {
    console.error("Kling video error:", error);
    return NextResponse.json(
      { error: `Kling 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

export const maxDuration = 60;

function generateJWT(accessKey: string, secretKey: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

async function uploadToHost(buffer: Buffer, filename: string): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const formData = new FormData();
  formData.append("file", new Blob([uint8]), filename);

  const response = await fetch("https://0x0.st", {
    method: "POST",
    body: formData,
    headers: { "User-Agent": "curl/7.79.1" },
  });

  if (!response.ok) {
    const catboxForm = new FormData();
    catboxForm.append("reqtype", "fileupload");
    catboxForm.append("fileToUpload", new Blob([uint8]), filename);
    const catboxResponse = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catboxForm,
    });
    const url = await catboxResponse.text();
    if (!url.startsWith("http")) throw new Error("All uploads failed");
    return url.trim();
  }

  const url = await response.text();
  if (!url.startsWith("http")) throw new Error(`Upload failed: ${url}`);
  return url.trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const videoFile = formData.get("video") as File | null;
    const prompt = (formData.get("prompt") as string) || "";
    const orientation =
      (formData.get("orientation") as string) || "video";
    const keepSound = formData.get("keepSound") === "true";
    const mode = (formData.get("mode") as string) || "std";

    if (!imageFile) {
      return NextResponse.json({ error: "참조 이미지를 업로드해주세요." }, { status: 400 });
    }
    if (!videoFile) {
      return NextResponse.json({ error: "참조 비디오를 업로드해주세요." }, { status: 400 });
    }

    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: "KLING_ACCESS_KEY/SECRET_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Upload files
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    const [imageUrl, videoUrl] = await Promise.all([
      uploadToHost(imageBuffer, "image.png"),
      uploadToHost(videoBuffer, "video.mp4"),
    ]);

    // Create motion control task
    const token = generateJWT(accessKey, secretKey);

    const payload: Record<string, unknown> = {
      image_url: imageUrl,
      video_url: videoUrl,
      character_orientation: orientation,
      mode,
      keep_original_sound: keepSound ? "yes" : "no",
    };
    if (prompt.trim()) payload.prompt = prompt;

    const response = await fetch(
      "https://api.klingai.com/v1/videos/motion-control",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `Motion Control 오류: ${result.message}` },
        { status: 500 }
      );
    }

    const taskId = result.data?.task_id;
    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID를 받지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId,
      message: "Motion Control 비디오 생성이 시작되었습니다.",
    });
  } catch (error) {
    console.error("Motion control error:", error);
    return NextResponse.json(
      { error: `Motion Control 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

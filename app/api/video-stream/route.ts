import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operationName = searchParams.get("op");

  if (!operationName) {
    return new Response("op required", { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY missing", { status: 500 });
  }

  const opRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
  );
  const operation = await opRes.json();

  if (operation.error) {
    return new Response(operation.error.message || "operation error", { status: 502 });
  }

  const videoUri =
    operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

  if (!videoUri) {
    return new Response("video not ready", { status: 404 });
  }

  const videoRes = await fetch(videoUri, {
    headers: { "x-goog-api-key": apiKey },
  });

  if (!videoRes.ok || !videoRes.body) {
    return new Response(
      `video download failed: ${videoRes.status} ${videoRes.statusText}`,
      { status: 502 }
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": videoRes.headers.get("content-type") || "video/mp4",
    "Cache-Control": "private, max-age=3600",
  };
  const contentLength = videoRes.headers.get("content-length");
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(videoRes.body, { headers });
}

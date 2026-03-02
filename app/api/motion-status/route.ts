import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

export const maxDuration = 30;

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

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "taskId가 필요합니다." }, { status: 400 });
    }

    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: "KLING_ACCESS_KEY/SECRET_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const token = generateJWT(accessKey, secretKey);

    const response = await fetch(
      `https://api.klingai.com/v1/videos/motion-control/${taskId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `상태 조회 실패: ${result.message}` },
        { status: 500 }
      );
    }

    const status = result.data?.task_status;

    if (status === "succeed") {
      const videos = result.data?.task_result?.videos || [];
      const videoUrl = videos[0]?.url || "";
      const duration = videos[0]?.duration || 0;

      return NextResponse.json({
        done: true,
        videoUrl,
        duration,
        message: "Motion Control 비디오 생성 완료!",
      });
    }

    if (status === "failed") {
      return NextResponse.json({
        done: true,
        error: `작업 실패: ${result.data?.task_status_msg || "Unknown"}`,
      });
    }

    return NextResponse.json({
      done: false,
      status,
      message: `상태: ${status}`,
    });
  } catch (error) {
    console.error("Motion status error:", error);
    return NextResponse.json(
      { error: `상태 확인 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

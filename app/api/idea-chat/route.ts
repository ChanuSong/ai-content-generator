import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

export const maxDuration = 60;

const DEFAULT_SYSTEM_PROMPT = `당신은 콘텐츠 시나리오 기획 전문 AI입니다.
사용자가 콘텐츠 아이디어를 발전시킬 수 있도록 도와주세요.
- 영상, 블로그, SNS 등 다양한 콘텐츠 형식에 대한 시나리오를 제안합니다.
- 타겟 오디언스, 핵심 메시지, 구성(인트로/본문/아웃트로) 등을 구체적으로 제시합니다.
- 사용자의 아이디어를 확장하고 개선하는 방향으로 대화합니다.
- 한국어로 답변합니다.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "메시지를 입력해주세요." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_API_KEY가 설정되지 않았습니다." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(
            new TextEncoder().encode("data: [DONE]\n\n")
          );
          controller.close();
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Idea chat error:", error);
    return new Response(
      JSON.stringify({
        error: `채팅 오류: ${error instanceof Error ? error.message : String(error)}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

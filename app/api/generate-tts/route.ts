import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceName, stylePrompt, model, multiSpeaker, script, speakerConfigs } = body;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const ttsModel = model || "gemini-2.5-flash-preview-tts";

    if (multiSpeaker) {
      // Multi-speaker TTS
      if (!script?.trim()) {
        return NextResponse.json({ error: "대본을 입력해주세요." }, { status: 400 });
      }

      if (!speakerConfigs?.length) {
        return NextResponse.json({ error: "화자 설정이 필요합니다." }, { status: 400 });
      }

      let finalScript = script;
      if (stylePrompt?.trim()) {
        finalScript = `${stylePrompt.trim()}\n\n${script}`;
      }

      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: finalScript,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerConfigs.map(
                (s: { speaker: string; voice: string }) => ({
                  speaker: s.speaker,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: s.voice },
                  },
                })
              ),
            },
          },
        },
      });

      const audioData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        return NextResponse.json({ error: "오디오 생성 실패" }, { status: 500 });
      }

      return NextResponse.json({
        audio: audioData,
        mimeType:
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData
            ?.mimeType || "audio/L16;rate=24000",
      });
    } else {
      // Single speaker TTS
      if (!text?.trim()) {
        return NextResponse.json(
          { error: "텍스트를 입력해주세요." },
          { status: 400 }
        );
      }

      const voice = voiceName?.split(" -- ")[0]?.trim() || "Kore";
      let finalContent = text;
      if (stylePrompt?.trim()) {
        finalContent = `${stylePrompt.trim()}: ${text}`;
      }

      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: finalContent,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const audioData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        return NextResponse.json({ error: "오디오 생성 실패" }, { status: 500 });
      }

      return NextResponse.json({
        audio: audioData,
        mimeType:
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData
            ?.mimeType || "audio/L16;rate=24000",
      });
    }
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: `TTS 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

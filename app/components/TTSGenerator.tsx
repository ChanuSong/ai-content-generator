"use client";

import { useState } from "react";

const VOICES = [
  "Zephyr -- Bright", "Puck -- Upbeat", "Charon -- Informative", "Kore -- Firm",
  "Fenrir -- Excitable", "Leda -- Youthful", "Orus -- Firm", "Aoede -- Breezy",
  "Callirrhoe -- Easy-going", "Autonoe -- Bright", "Enceladus -- Breathy",
  "Iapetus -- Clear", "Umbriel -- Easy-going", "Algieba -- Smooth", "Despina -- Smooth",
  "Erinome -- Clear", "Algenib -- Gravelly", "Rasalgethi -- Informative",
  "Laomedeia -- Upbeat", "Achernar -- Soft", "Alnilam -- Firm", "Schedar -- Even",
  "Gacrux -- Mature", "Pulcherrima -- Forward", "Achird -- Friendly",
  "Zubenelgenubi -- Casual", "Vindemiatrix -- Gentle", "Sadachbia -- Lively",
  "Sadaltager -- Knowledgeable", "Sulafat -- Warm",
];

function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): Blob {
  const pcmData = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(pcmData);

  return new Blob([buffer], { type: "audio/wav" });
}

export default function TTSGenerator() {
  const [tab, setTab] = useState<"single" | "multi">("single");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Kore -- Firm");
  const [stylePrompt, setStylePrompt] = useState("");
  const [script, setScript] = useState("");
  const [speakers, setSpeakers] = useState([
    { name: "Joe", voice: "Kore -- Firm" },
    { name: "Jane", voice: "Puck -- Upbeat" },
  ]);
  const [multiStyle, setMultiStyle] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const generateSingle = async () => {
    if (!text.trim()) { setStatus("텍스트를 입력해주세요."); return; }
    setLoading(true);
    setStatus("음성 생성 중...");
    setAudioUrl(null);

    try {
      const res = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName: voice, stylePrompt }),
      });
      const data = await res.json();
      if (data.error) { setStatus(`오류: ${data.error}`); return; }

      const wavBlob = pcmToWav(data.audio);
      setAudioUrl(URL.createObjectURL(wavBlob));
      setStatus("음성 생성 완료!");
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const generateMulti = async () => {
    if (!script.trim()) { setStatus("대본을 입력해주세요."); return; }
    setLoading(true);
    setStatus("다중 화자 음성 생성 중...");
    setAudioUrl(null);

    try {
      const res = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          multiSpeaker: true,
          script,
          speakerConfigs: speakers.map((s) => ({
            speaker: s.name,
            voice: s.voice.split(" -- ")[0].trim(),
          })),
          stylePrompt: multiStyle,
        }),
      });
      const data = await res.json();
      if (data.error) { setStatus(`오류: ${data.error}`); return; }

      const wavBlob = pcmToWav(data.audio);
      setAudioUrl(URL.createObjectURL(wavBlob));
      setStatus("다중 화자 음성 생성 완료!");
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSpeaker = (idx: number, field: "name" | "voice", value: string) => {
    setSpeakers((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === "single" ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"}`}
        >
          단일 화자
        </button>
        <button
          onClick={() => setTab("multi")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === "multi" ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"}`}
        >
          다중 화자
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {tab === "single" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">텍스트</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="변환할 텍스트를 입력하세요..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">목소리 (30종)</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                >
                  {VOICES.map((v) => (<option key={v} value={v} className="bg-slate-900">{v}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">스타일 프롬프트 (선택)</label>
                <input
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="예: Spooky whisper, Excited and fast"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={generateSingle}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all"
              >
                {loading ? "생성 중..." : "음성 생성"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">대본</label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder={"Joe: 안녕하세요.\nJane: 반갑습니다."}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                  rows={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">화자 설정</label>
                {speakers.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateSpeaker(i, "name", e.target.value)}
                      placeholder="화자 이름"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                    />
                    <select
                      value={s.voice}
                      onChange={(e) => updateSpeaker(i, "voice", e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                    >
                      {VOICES.map((v) => (<option key={v} value={v} className="bg-slate-900">{v}</option>))}
                    </select>
                    {speakers.length > 1 && (
                      <button
                        onClick={() => setSpeakers((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setSpeakers((prev) => [...prev, { name: "", voice: "Kore -- Firm" }])}
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  + 화자 추가
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">스타일 (선택)</label>
                <input
                  value={multiStyle}
                  onChange={(e) => setMultiStyle(e.target.value)}
                  placeholder="예: Speaker1 sounds tired, Speaker2 sounds excited."
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                />
              </div>
              <button
                onClick={generateMulti}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all"
              >
                {loading ? "생성 중..." : "다중 화자 음성 생성"}
              </button>
            </>
          )}
        </div>

        <div className="space-y-4">
          {audioUrl && (
            <div>
              <audio controls src={audioUrl} className="w-full" />
              <a
                href={audioUrl}
                download="tts_output.wav"
                className="block text-center text-sm text-violet-400 hover:text-violet-300 mt-2 transition-colors"
              >
                WAV 다운로드
              </a>
            </div>
          )}
          {status && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

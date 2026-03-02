"use client";

import { useState, useRef, useCallback } from "react";

export default function KlingVideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [negativePrompt, setNegativePrompt] = useState("text, watermark, logo, lowres");
  const [cfgScale, setCfgScale] = useState(0.5);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pollStatus = useCallback(async (taskId: string) => {
    const maxAttempts = 200; // ~16 min
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      setStatus(`비디오 생성 중... (${(i + 1) * 5}초 경과)`);

      try {
        const res = await fetch("/api/kling-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        const data = await res.json();

        if (data.done) {
          if (data.videoUrl) {
            setVideoUrl(data.videoUrl);
            setStatus("Kling 비디오 생성 완료!");
          } else {
            setStatus(`오류: ${data.error || "결과 없음"}`);
          }
          return;
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }
    setStatus("시간 초과");
  }, []);

  const generate = async () => {
    if (!image) { setStatus("이미지를 업로드해주세요."); return; }
    if (!prompt.trim()) { setStatus("프롬프트를 입력해주세요."); return; }

    setLoading(true);
    setStatus("Kling 비디오 생성 요청 중...");
    setVideoUrl(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("image", image);
      formData.append("duration", duration.toString());
      formData.append("aspectRatio", aspectRatio);
      formData.append("negativePrompt", negativePrompt);
      formData.append("cfgScale", cfgScale.toString());

      const res = await fetch("/api/kling-video", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setStatus(`오류: ${data.error}`);
        setLoading(false);
        return;
      }

      setStatus("작업이 시작되었습니다. 완료까지 수 분 소요됩니다...");
      await pollStatus(data.taskId);
    } catch (err) {
      setStatus(`오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">이미지 업로드</label>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="ref" className="max-h-48 mx-auto rounded" />
            ) : (
              <p className="text-gray-400">클릭하여 이미지 업로드</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImage(f); setImagePreview(URL.createObjectURL(f)); }
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="비디오 설명을 입력하세요"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder-gray-500"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">길이 (초)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value={5}>5초</option>
              <option value={10}>10초</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">비율</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">네거티브 프롬프트</label>
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            CFG Scale: {cfgScale}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={cfgScale}
            onChange={(e) => setCfgScale(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg"
        >
          {loading ? "생성 중..." : "Kling 비디오 생성"}
        </button>
      </div>

      <div className="space-y-4">
        {videoUrl && (
          <div>
            <video controls src={videoUrl} className="w-full rounded-lg" />
          </div>
        )}
        {status && (
          <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [quality, setQuality] = useState("720p");
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startPreview, setStartPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pollOperation = useCallback(async (operationName: string) => {
    const maxAttempts = 120; // 10 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      setStatus(`비디오 생성 중... (${(i + 1) * 5}초 경과)`);

      try {
        const res = await fetch("/api/check-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName }),
        });
        const data = await res.json();

        if (data.error) {
          setStatus(`오류: ${data.error}`);
          return;
        }
        if (data.done) {
          if (data.video) {
            setVideoUrl(data.video);
            setStatus("비디오 생성 완료!");
          } else if (data.error) {
            setStatus(`오류: ${data.error}`);
          }
          return;
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }
    setStatus("시간 초과 - 비디오 생성이 너무 오래 걸립니다.");
  }, []);

  const generate = async () => {
    if (!startFrame) { setStatus("시작 프레임을 업로드해주세요."); return; }
    if (!prompt.trim()) { setStatus("프롬프트를 입력해주세요."); return; }

    setLoading(true);
    setStatus("비디오 생성 요청 중...");
    setVideoUrl(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("duration", duration.toString());
      formData.append("quality", quality);
      formData.append("startFrame", startFrame);

      const res = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setStatus(`오류: ${data.error}`);
        setLoading(false);
        return;
      }

      setStatus("비디오 생성이 시작되었습니다. 완료까지 수 분 소요될 수 있습니다...");
      await pollOperation(data.operationName);
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
          <label className="block text-sm font-medium text-gray-300 mb-2">시작 프레임 (필수)</label>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {startPreview ? (
              <img src={startPreview} alt="start" className="max-h-48 mx-auto rounded" />
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
                if (f) {
                  setStartFrame(f);
                  setStartPreview(URL.createObjectURL(f));
                }
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 사람이 천천히 손을 흔든다"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder-gray-500"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">비율</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">길이 (초)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value={4}>4초</option>
              <option value={6}>6초</option>
              <option value={8}>8초</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">화질</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">1080p, 4K는 8초 길이만 지원</p>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg"
        >
          {loading ? "생성 중..." : "비디오 생성"}
        </button>
      </div>

      <div className="space-y-4">
        {videoUrl && (
          <div>
            <video controls src={videoUrl} className="w-full rounded-lg" />
            <a
              href={videoUrl}
              download="generated_video.mp4"
              className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-2"
            >
              다운로드
            </a>
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

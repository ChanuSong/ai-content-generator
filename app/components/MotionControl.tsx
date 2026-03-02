"use client";

import { useState, useRef, useCallback } from "react";

export default function MotionControl() {
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [orientation, setOrientation] = useState("video");
  const [keepSound, setKeepSound] = useState(true);
  const [mode, setMode] = useState("std");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const pollStatus = useCallback(async (taskId: string) => {
    const maxAttempts = 240; // 20 min at 5s
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      setStatus(`Motion Control 생성 중... (${(i + 1) * 5}초 경과)`);

      try {
        const res = await fetch("/api/motion-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        const data = await res.json();

        if (data.done) {
          if (data.videoUrl) {
            setResultUrl(data.videoUrl);
            setStatus(`Motion Control 완료! (${data.duration || "?"}초)`);
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
    if (!image) { setStatus("참조 이미지를 업로드해주세요."); return; }
    if (!video) { setStatus("참조 비디오를 업로드해주세요."); return; }

    setLoading(true);
    setStatus("Motion Control 요청 중...");
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("video", video);
      formData.append("prompt", prompt);
      formData.append("orientation", orientation);
      formData.append("keepSound", keepSound.toString());
      formData.append("mode", mode);

      const res = await fetch("/api/motion-control", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setStatus(`오류: ${data.error}`);
        setLoading(false);
        return;
      }

      setStatus("작업이 시작되었습니다. 10~20분 소요될 수 있습니다...");
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            참조 이미지 (캐릭터/피사체)
          </label>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 transition-colors"
            onClick={() => imageRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="ref" className="max-h-40 mx-auto rounded" />
            ) : (
              <p className="text-gray-400">클릭하여 이미지 업로드</p>
            )}
            <input
              ref={imageRef}
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            참조 비디오 (모션 소스, 3~30초)
          </label>
          <div
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 transition-colors"
            onClick={() => videoRef.current?.click()}
          >
            {videoPreview ? (
              <video src={videoPreview} className="max-h-40 mx-auto rounded" controls />
            ) : (
              <p className="text-gray-400">클릭하여 비디오 업로드</p>
            )}
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setVideo(f); setVideoPreview(URL.createObjectURL(f)); }
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">프롬프트 (선택)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: A person dancing in a modern studio with neon lights"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder-gray-500"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">출력 방향</label>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value="video">video (비디오 프레이밍)</option>
              <option value="image">image (이미지 프레이밍)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">모드</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-100"
            >
              <option value="std">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={keepSound}
            onChange={(e) => setKeepSound(e.target.checked)}
            className="rounded"
          />
          참조 비디오 오디오 유지
        </label>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg"
        >
          {loading ? "생성 중..." : "Motion Control 비디오 생성"}
        </button>
      </div>

      <div className="space-y-4">
        {resultUrl && (
          <div>
            <video controls src={resultUrl} className="w-full rounded-lg" />
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

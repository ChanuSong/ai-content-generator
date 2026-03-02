"use client";

import { useState, useRef, useCallback } from "react";

interface VideoResult {
  url: string;
  status: "generating" | "done" | "error";
  error?: string;
  elapsed?: number;
}

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [quality, setQuality] = useState("720p");
  const [count, setCount] = useState(1);
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startPreview, setStartPreview] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setFrameFromFile = useCallback((file: File) => {
    setStartFrame(file);
    setStartPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) setFrameFromFile(file);
  }, [setFrameFromFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pollOperation = useCallback(async (operation: any): Promise<string> => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const res = await fetch("/api/check-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (data.done) {
        if (data.video) return data.video;
        throw new Error("비디오 생성 실패");
      }
    }
    throw new Error("시간 초과");
  }, []);

  const generateOne = async (index: number): Promise<void> => {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("aspectRatio", aspectRatio);
    formData.append("duration", duration.toString());
    formData.append("quality", quality);
    formData.append("startFrame", startFrame!);

    const res = await fetch("/api/generate-video", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.error) {
      setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: data.error } : v));
      return;
    }

    if (!data.operation?.name) {
      setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: "작업 객체를 받지 못했습니다." } : v));
      return;
    }

    try {
      const videoUrl = await pollOperation(data.operation);
      setVideos((prev) => prev.map((v, i) => i === index ? { url: videoUrl, status: "done" } : v));
    } catch (err) {
      setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: err instanceof Error ? err.message : String(err) } : v));
    }
  };

  const generate = async () => {
    if (!startFrame) { setStatus("시작 프레임을 업로드해주세요."); return; }
    if (!prompt.trim()) { setStatus("프롬프트를 입력해주세요."); return; }

    if ((quality === "1080p" || quality === "4K") && duration !== 8) {
      setStatus(`${quality} 화질은 8초 길이만 지원합니다.`);
      return;
    }

    setLoading(true);
    setStatus(`비디오 ${count}개 병렬 생성 중...`);
    setVideos(Array.from({ length: count }, () => ({ url: "", status: "generating" as const })));

    try {
      await Promise.allSettled(
        Array.from({ length: count }, (_, i) => generateOne(i))
      );

      setVideos((prev) => {
        const done = prev.filter((v) => v.status === "done").length;
        const failed = prev.filter((v) => v.status === "error").length;
        setStatus(`완료! ${done}개 성공${failed > 0 ? `, ${failed}개 실패` : ""}`);
        return prev;
      });
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
          <label className="block text-sm font-medium text-slate-300 mb-2">시작 프레임 (필수)</label>
          <div
            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragging
                ? "border-violet-500 bg-violet-500/10"
                : "border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]"
            }`}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {startPreview ? (
              <img src={startPreview} alt="start" className="max-h-48 mx-auto rounded" />
            ) : (
              <p className="text-slate-400">
                {dragging ? "여기에 놓으세요" : "클릭 또는 드래그하여 이미지 업로드"}
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFrameFromFile(f);
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 사람이 천천히 손을 흔든다"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">비율</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value="16:9" className="bg-slate-900">16:9</option>
              <option value="9:16" className="bg-slate-900">9:16</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">길이</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value={4} className="bg-slate-900">4초</option>
              <option value={6} className="bg-slate-900">6초</option>
              <option value={8} className="bg-slate-900">8초</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">화질</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value="720p" className="bg-slate-900">720p</option>
              <option value="1080p" className="bg-slate-900">1080p</option>
              <option value="4K" className="bg-slate-900">4K</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">생성 수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n} className="bg-slate-900">{n}개</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">1080p, 4K는 8초 길이만 지원</p>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all"
        >
          {loading ? "생성 중..." : `비디오 ${count}개 생성`}
        </button>
      </div>

      <div className="space-y-4">
        {videos.map((v, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
            {v.status === "generating" && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                비디오 {i + 1} 생성 중...
              </div>
            )}
            {v.status === "done" && (
              <div>
                <video controls src={v.url} className="w-full rounded-lg" />
                <a
                  href={v.url}
                  download={`generated_video_${i}.mp4`}
                  className="block text-center text-sm text-violet-400 hover:text-violet-300 mt-2 transition-colors"
                >
                  다운로드
                </a>
              </div>
            )}
            {v.status === "error" && (
              <p className="text-sm text-red-400">비디오 {i + 1} 실패: {v.error}</p>
            )}
          </div>
        ))}
        {status && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300 whitespace-pre-wrap">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

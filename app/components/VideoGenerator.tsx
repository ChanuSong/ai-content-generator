"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoResult {
  url: string;
  status: "generating" | "done" | "error";
  error?: string;
  elapsed?: number;
}

interface VideoGeneratorProps {
  onSendToImage?: (file: File) => void;
  externalStartFrame?: File | null;
  onExternalStartFrameConsumed?: () => void;
}

export default function VideoGenerator({ onSendToImage, externalStartFrame, onExternalStartFrameConsumed }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [quality, setQuality] = useState("720p");
  const [count, setCount] = useState(1);
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startPreview, setStartPreview] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [endPreview, setEndPreview] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [endDragging, setEndDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endFileRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const setFrameFromFile = useCallback((file: File) => {
    setStartFrame(file);
    setStartPreview(URL.createObjectURL(file));
  }, []);

  const setEndFrameFromFile = useCallback((file: File) => {
    setEndFrame(file);
    setEndPreview(URL.createObjectURL(file));
  }, []);

  const removeEndFrame = useCallback(() => {
    setEndFrame(null);
    if (endPreview) URL.revokeObjectURL(endPreview);
    setEndPreview(null);
  }, [endPreview]);

  // Accept external start frame from ImageGenerator
  useEffect(() => {
    if (externalStartFrame) {
      setFrameFromFile(externalStartFrame);
      onExternalStartFrameConsumed?.();
    }
  }, [externalStartFrame, setFrameFromFile, onExternalStartFrameConsumed]);

  // Auto-enforce constraints when end frame is set
  useEffect(() => {
    if (endFrame) {
      setDuration(8);
      setQuality("720p");
    }
  }, [endFrame]);

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

  const handleEndDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setEndDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) setEndFrameFromFile(file);
  }, [setEndFrameFromFile]);

  const handleEndDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setEndDragging(true);
  }, []);

  const handleEndDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setEndDragging(false);
  }, []);

  const pollOperation = useCallback(async (operationName: string): Promise<string> => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const res = await fetch("/api/check-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
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
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("duration", duration.toString());
      formData.append("quality", quality);
      formData.append("startFrame", startFrame!);
      if (endFrame) {
        formData.append("endFrame", endFrame);
      }

      const res = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: data.error } : v));
        return;
      }

      if (!data.operationName) {
        setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: "작업 이름을 받지 못했습니다." } : v));
        return;
      }

      const videoUrl = await pollOperation(data.operationName);
      setVideos((prev) => prev.map((v, i) => i === index ? { url: videoUrl, status: "done" } : v));
    } catch (err) {
      setVideos((prev) => prev.map((v, i) => i === index ? { ...v, status: "error", error: err instanceof Error ? err.message : String(err) } : v));
    }
  };

  const captureVideoFrame = useCallback((video: HTMLVideoElement): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Blob conversion failed")); return; }
        resolve(new File([blob], `frame_${Date.now()}.png`, { type: "image/png" }));
      }, "image/png");
    });
  }, []);

  const captureFrame = useCallback(async (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    try {
      const file = await captureVideoFrame(video);
      onSendToImage?.(file);
    } catch { /* ignore */ }
  }, [onSendToImage, captureVideoFrame]);

  const useLastFrameAsStart = useCallback(async (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    // Seek to the last frame (duration - small epsilon)
    const targetTime = Math.max(0, video.duration - 0.05);
    video.currentTime = targetTime;
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
    });
    try {
      const file = await captureVideoFrame(video);
      setFrameFromFile(file);
      setStatus("마지막 프레임을 시작 프레임으로 설정했습니다.");
    } catch { /* ignore */ }
  }, [captureVideoFrame, setFrameFromFile]);

  const generate = async () => {
    if (!startFrame) { setStatus("시작 프레임을 업로드해주세요."); return; }
    if (!prompt.trim()) { setStatus("프롬프트를 입력해주세요."); return; }

    if ((quality === "1080p" || quality === "4K") && duration !== 8) {
      setStatus(`${quality} 화질은 8초 길이만 지원합니다.`);
      return;
    }

    if (endFrame && (quality !== "720p" || duration !== 8)) {
      setStatus("끝 프레임 사용 시 720p / 8초만 지원됩니다.");
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
          <label className="block text-sm font-medium text-slate-300 mb-2">끝 프레임 (선택)</label>
          <div
            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              endDragging
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.02]"
            }`}
            onClick={() => endFileRef.current?.click()}
            onDrop={handleEndDrop}
            onDragOver={handleEndDragOver}
            onDragLeave={handleEndDragLeave}
          >
            {endPreview ? (
              <div className="relative inline-block">
                <img src={endPreview} alt="end" className="max-h-48 mx-auto rounded" />
                <button
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); removeEndFrame(); }}
                >
                  ×
                </button>
              </div>
            ) : (
              <p className="text-slate-400">
                {endDragging ? "여기에 놓으세요" : "클릭 또는 드래그하여 끝 프레임 업로드"}
              </p>
            )}
            <input
              ref={endFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setEndFrameFromFile(f);
              }}
            />
          </div>
          {endFrame && (
            <p className="text-xs text-amber-400 mt-1">끝 프레임 사용 시 720p / 8초로 자동 설정됩니다.</p>
          )}
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
                <video
                  controls
                  src={v.url}
                  className="w-full rounded-lg"
                  ref={(el) => { videoRefs.current[i] = el; }}
                />
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  <a
                    href={v.url}
                    download={`generated_video_${i}.mp4`}
                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    다운로드
                  </a>
                  <button
                    onClick={() => useLastFrameAsStart(i)}
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    마지막 프레임 → 시작 프레임
                  </button>
                  {onSendToImage && (
                    <button
                      onClick={() => captureFrame(i)}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                    현재 프레임 → 이미지 탭
                    </button>
                  )}
                </div>
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

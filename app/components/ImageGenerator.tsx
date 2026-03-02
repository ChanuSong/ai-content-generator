"use client";

import { useState, useRef } from "react";

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageSize, setImageSize] = useState("2K");
  const [images, setImages] = useState<string[]>([]);
  const [refImages, setRefImages] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setRefImages((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setRefPreviews((prev) => [...prev, ...previews]);
  };

  const removeRefImage = (idx: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== idx));
    setRefPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setStatus("프롬프트를 입력해주세요.");
      return;
    }
    setLoading(true);
    setStatus("이미지 생성 중...");
    setImages([]);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("aspectRatio", aspectRatio);
      formData.append("imageSize", imageSize);
      refImages.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/generate-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setStatus(`오류: ${data.error}`);
      } else {
        setImages(data.images || []);
        setStatus(`생성 완료! ${data.images?.length || 0}장`);
      }
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
          <label className="block text-sm font-medium text-slate-300 mb-2">
            참조 이미지 (선택)
          </label>
          <div
            className="border border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-violet-500/50 hover:bg-white/[0.02] transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-slate-400">클릭하여 이미지 업로드</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {refPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {refPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`ref-${i}`}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    onClick={() => removeRefImage(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            프롬프트
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 아이를 일어서서 춤출 준비 자세를 취하고 있는 모습으로 그려줘."
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              비율
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r} value={r} className="bg-slate-900">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              해상도
            </label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-slate-100 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              {IMAGE_SIZES.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all"
        >
          {loading ? "생성 중..." : "이미지 생성"}
        </button>
      </div>

      <div className="space-y-4">
        {images.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {images.map((src, i) => (
              <div key={i}>
                <img
                  src={src}
                  alt={`generated-${i}`}
                  className="w-full rounded-lg"
                />
                <a
                  href={src}
                  download={`generated_${i}.png`}
                  className="block text-center text-sm text-violet-400 hover:text-violet-300 mt-1 transition-colors"
                >
                  다운로드
                </a>
              </div>
            ))}
          </div>
        )}
        {status && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

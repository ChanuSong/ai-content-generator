"use client";

import { useState, useEffect } from "react";
import ImageGenerator from "./components/ImageGenerator";
import TTSGenerator from "./components/TTSGenerator";
import VideoGenerator from "./components/VideoGenerator";
import KlingVideoGenerator from "./components/KlingVideoGenerator";
import MotionControl from "./components/MotionControl";
import IdeaChat from "./components/IdeaChat";

const TABS = [
  { id: "image", label: "이미지 생성", icon: "🎨", desc: "Gemini Pro" },
  { id: "tts", label: "음성 생성", icon: "🗣️", desc: "Gemini TTS" },
  { id: "video", label: "비디오 생성", icon: "🎬", desc: "Veo 3.1" },
  // 의도적으로 UI에서 숨김 — API 라우트와 컴포넌트는 유지
  // { id: "kling", label: "Kling 비디오", icon: "🎥", desc: "Kling AI" },
  // { id: "motion", label: "모션 컨트롤", icon: "🎭", desc: "Kling Motion" },
  { id: "idea", label: "아이디어챗", icon: "💡", desc: "Gemini 3 Flash" },
];

function AuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("authenticated", "true");
        onAuthenticated();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            Nano Pro
          </h1>
          <p className="text-slate-400 text-sm">AI Content Generator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all"
          >
            {loading ? "확인 중..." : "진입"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("image");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("authenticated");
    if (stored === "true") {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  if (!authChecked) return null;

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Nano Pro
        </h1>
        <p className="text-slate-400 mt-2">
          AI Image, Video & Audio Generator
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 mb-8 justify-center">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20 animate-glow"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            <span className={`ml-1.5 text-xs ${activeTab === tab.id ? "text-violet-200" : "text-slate-500"}`}>({tab.desc})</span>
          </button>
        ))}
      </nav>

      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
        {activeTab === "image" && <ImageGenerator />}
        {activeTab === "tts" && <TTSGenerator />}
        {activeTab === "video" && <VideoGenerator />}
        {/* 의도적으로 UI에서 숨김 — 컴포넌트는 유지 */}
        {/* {activeTab === "kling" && <KlingVideoGenerator />} */}
        {/* {activeTab === "motion" && <MotionControl />} */}
        {activeTab === "idea" && <IdeaChat />}
      </div>

      <footer className="text-center mt-10">
        <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-violet-500/30 to-transparent mb-4" />
        <p className="text-xs text-slate-500">
          Powered by Gemini Pro, Veo 3.1, Gemini 3 Flash
        </p>
      </footer>
    </main>
  );
}

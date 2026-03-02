"use client";

import { useState } from "react";
import ImageGenerator from "./components/ImageGenerator";
import TTSGenerator from "./components/TTSGenerator";
import VideoGenerator from "./components/VideoGenerator";
import KlingVideoGenerator from "./components/KlingVideoGenerator";
import MotionControl from "./components/MotionControl";

const TABS = [
  { id: "image", label: "이미지 생성", icon: "🎨", desc: "Gemini Pro" },
  { id: "tts", label: "음성 생성", icon: "🗣️", desc: "Gemini TTS" },
  { id: "video", label: "비디오 생성", icon: "🎬", desc: "Veo 3.1" },
  { id: "kling", label: "Kling 비디오", icon: "🎥", desc: "Kling AI" },
  { id: "motion", label: "모션 컨트롤", icon: "🎭", desc: "Kling Motion" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("image");

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Nano Pro
        </h1>
        <p className="text-gray-400 mt-2">
          AI Image, Video & Audio Generator
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 mb-8 justify-center">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-gray-800 text-white ring-1 ring-gray-600"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-500">({tab.desc})</span>
          </button>
        ))}
      </nav>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        {activeTab === "image" && <ImageGenerator />}
        {activeTab === "tts" && <TTSGenerator />}
        {activeTab === "video" && <VideoGenerator />}
        {activeTab === "kling" && <KlingVideoGenerator />}
        {activeTab === "motion" && <MotionControl />}
      </div>

      <footer className="text-center mt-8 text-xs text-gray-600">
        Powered by Gemini Pro, Veo 3.1, Kling AI
      </footer>
    </main>
  );
}

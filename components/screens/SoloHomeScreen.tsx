"use client";

import React from "react";
import { SoloStats } from "@/types/solo";

interface SoloHomeScreenProps {
  playerName: string | null;
  soloStats: SoloStats;
  onStartGame: () => void;
  onShowRules: () => void;
  onResetProfile: () => void;
  onGoBack: () => void;
}

const SoloHomeScreen: React.FC<SoloHomeScreenProps> = ({
  playerName,
  soloStats,
  onStartGame,
  onShowRules,
  onResetProfile,
  onGoBack,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col gap-6 p-4 sm:p-6 lg:p-10 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-3 rounded-2xl border border-slate-700/60 text-slate-200 hover:text-white hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          กลับหน้าเลือกโหมด
        </button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={onResetProfile}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-red-400/60 hover:bg-red-500/10 transition-all"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            รีเซ็ตโปรไฟล์
          </button>
          <button
            onClick={onShowRules}
            className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <i className="fas fa-book-open mr-2"></i>
            อ่านกติกา
          </button>
        </div>
      </div>
      {/* Header */}
  <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
              <i className="fas fa-user-ninja text-2xl text-white"></i>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-300 font-semibold">
                Solo Practice
              </p>
              <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                สวัสดี {playerName}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                ฝึกฝนกับบอทสุดฉลาด เพื่อเตรียมพร้อมลงแข่งกับเพื่อน ๆ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-500/10 space-y-8">
        <div className="space-y-6">
          <div className="relative rounded-3xl overflow-hidden border border-purple-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/10 to-cyan-500/20 opacity-70"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-100 text-xs font-semibold">
                    <i className="fas fa-bomb"></i>
                    เป้าหมาย: หาคำระเบิดให้เจอ
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    เจาะลึกคำใบ้ของบอท แล้วเป็นแชมป์ Solo!
                  </h2>
                  <p className="text-slate-200/80 text-sm sm:text-base">
                    โหมดนี้ออกแบบมาเพื่อฝึกการตีความคำใบ้ และสร้างความกดดันเทียบเท่าการแข่งจริง
                    คุณมีเวลาจำกัด 5 นาที พร้อมระบบคะแนนและคอมโบสุดมันส์
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full sm:w-auto">
                  <button
                    onClick={onShowRules}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-white/30 text-white/90 hover:bg-white/10 transition-all"
                  >
                    <i className="fas fa-book-open"></i>
                    กติกาโหมด Solo
                  </button>
                  <button
                    onClick={onStartGame}
                    className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 text-white font-semibold text-lg shadow-2xl hover:shadow-purple-500/40 transition-all"
                  >
                    <i className="fas fa-bolt"></i>
                    เริ่มเล่นเดี๋ยวนี้
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">เกมที่เล่น</p>
              <p className="text-2xl font-bold text-white">
                {soloStats.gamesPlayed.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">อัตราชนะ</p>
              <p className="text-2xl font-bold text-emerald-300">
                {soloStats.gamesPlayed === 0
                  ? "0%"
                  : `${soloStats.winRate.toFixed(1)}%`}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">คะแนนสูงสุด</p>
              <p className="text-2xl font-bold text-yellow-300">
                {soloStats.bestScore.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">Combo สูงสุด</p>
              <p className="text-2xl font-bold text-orange-300">
                {soloStats.longestCombo}x
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">เวลาที่ดีที่สุด</p>
              <p className="text-2xl font-bold text-cyan-300">
                {soloStats.bestTime
                  ? `${soloStats.bestTime}s`
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">คำระเบิดที่เจอแล้ว</p>
              <p className="text-2xl font-bold text-purple-300">
                {soloStats.totalWordsFound}
              </p>
            </div>
          </div>

          {/* Achievements */}
          <div className="rounded-3xl border border-slate-700/40 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <i className="fas fa-trophy text-yellow-300"></i>
              <h3 className="text-lg font-bold text-white">เว็บเก็บเหรียญ</h3>
            </div>
            {soloStats.achievements.length === 0 ? (
              <p className="text-slate-400 text-sm">
                ยังไม่มีเหรียญความสำเร็จ เริ่มเล่นเพื่อปลดล็อกความท้าทายต่าง ๆ
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {soloStats.achievements.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/30 text-amber-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloHomeScreen;

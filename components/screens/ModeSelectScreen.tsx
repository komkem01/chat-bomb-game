"use client";

import React from "react";
import { SoloStats } from "@/types/solo";

interface ModeSelectScreenProps {
  playerName: string | null;
  soloStats: SoloStats;
  onSelectSolo: () => void;
  onSelectMultiplayer: () => void;
  onResetProfile: () => void;
}

const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  playerName,
  soloStats,
  onSelectSolo,
  onSelectMultiplayer,
  onResetProfile,
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 sm:p-6 animate-slide-up overflow-y-auto">
      <div className="w-full max-w-4xl space-y-6">
        <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold mb-2">
                ยินดีต้อนรับ
              </p>
              <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-green-300 bg-clip-text text-transparent">
                พร้อมเล่นยัง {playerName}
              </h1>
              <p className="text-slate-400 mt-2 text-sm sm:text-base">
                เลือกโหมดการเล่นที่คุณต้องการได้เลย จะวัดดวงกับเพื่อนหรือเก็บเลเวลกับบอทก็ได้ทั้งหมด
              </p>
            </div>
            <button
              onClick={onResetProfile}
              className="self-start sm:self-auto px-5 py-3 rounded-2xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-red-400/60 hover:bg-red-500/10 transition-all"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              เปลี่ยนชื่อผู้เล่น
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-xl border border-red-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/15 via-orange-500/10 to-yellow-500/10 opacity-80"></div>
            <div className="relative z-10 flex flex-col h-full gap-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg">
                  <i className="fas fa-users text-2xl text-white"></i>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-red-200 font-semibold">
                    Multiplayer
                  </p>
                  <h2 className="text-2xl font-bold text-white">เล่นกับเพื่อน</h2>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                ตั้งคำระเบิดลับแล้วล่อเพื่อนให้พูด หรือร่วมมือกันเอาตัวรอด ภารกิจนี้ต้องใช้ทั้งไหวพริบและการสื่อสารขั้นเทพ!
              </p>
              <ul className="text-slate-200 text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  รองรับตั้งห้องหรือเข้าห้องด้วยรหัส 6 หลัก
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  เจ้าของห้องตั้งคำและคำใบ้ได้อย่างอิสระ
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  อยู่ให้รอดครบ 10 นาทีเพื่อชนะ
                </li>
              </ul>
              <button
                onClick={onSelectMultiplayer}
                className="mt-auto w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white font-semibold text-lg shadow-2xl hover:shadow-red-500/40 transition-all"
              >
                <i className="fas fa-door-open mr-2"></i>
                เข้าสู่โหมดเล่นกลุ่ม
              </button>
            </div>
          </div>

          <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-700/20 via-indigo-600/10 to-blue-500/10 opacity-80"></div>
            <div className="relative z-10 flex flex-col h-full gap-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg">
                  <i className="fas fa-robot text-2xl text-white"></i>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-purple-200 font-semibold">
                    Solo Practice
                  </p>
                  <h2 className="text-2xl font-bold text-white">เล่นคนเดียว</h2>
                </div>
              </div>
              <p className="text-slate-200 text-sm">
                ประลองกับบอทที่ออกแบบมาอย่างฉลาด ใช้คำใบ้เพื่อไล่ล่าคำระเบิดให้เจอ ยิ่งเร็วคะแนนยิ่งสูง!
              </p>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-[0.3em] mb-2">สถิติคุณ</p>
                <div className="grid grid-cols-2 gap-4 text-white">
                  <div>
                    <p className="text-sm text-slate-400">เกมที่เล่น</p>
                    <p className="text-2xl font-bold">{soloStats.gamesPlayed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">อัตราชนะ</p>
                    <p className="text-2xl font-bold">{soloStats.winRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">คะแนนสูงสุด</p>
                    <p className="text-2xl font-bold text-amber-300">
                      {soloStats.bestScore.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">คอมโบสูงสุด</p>
                    <p className="text-2xl font-bold text-emerald-300">{soloStats.longestCombo}x</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onSelectSolo}
                className="mt-auto w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white font-semibold text-lg shadow-2xl hover:shadow-purple-500/40 transition-all"
              >
                <i className="fas fa-bolt mr-2"></i>
                ไปที่โหมด Solo
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs sm:text-sm">
          <i className="fas fa-info-circle mr-2"></i>
          เลือกโหมดได้ตลอดเวลา กลับมาหน้านี้ได้ด้วยการออกจากห้องหรือรีเฟรชหน้าเว็บ
        </p>
      </div>
    </div>
  );
};

export default ModeSelectScreen;

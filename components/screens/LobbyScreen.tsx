"use client";

import React from 'react';
import { MAX_PLAYERS_PER_ROOM } from '@/lib/constants';

interface LobbyScreenProps {
  playerName: string | null;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onResetProfile: () => void;
  onShowRules?: (gameMode: "solo" | "multiplayer") => void;
  onGoBack: () => void;
  isJoiningRoom?: boolean;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerName,
  roomCode,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
  onResetProfile,
  onShowRules,
  onGoBack,
  isJoiningRoom = false,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-slide-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-3 rounded-2xl border border-slate-700/60 text-slate-200 hover:text-white hover:border-blue-400/60 hover:bg-blue-500/10 transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          กลับหน้าเลือกโหมด
        </button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={onResetProfile}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-red-400/60 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-sync-alt"></i>
            รีเซ็ตโปรไฟล์
          </button>
          {onShowRules && (
            <button
              onClick={() => onShowRules("multiplayer")}
              className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-book-open"></i>
              อ่านกติกา
            </button>
          )}
        </div>
      </div>
      {/* Hero Header */}
      <div className="surface-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-cyan-500/15 opacity-80"></div>
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <i className="fas fa-users text-2xl text-white"></i>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200 font-semibold">
                  Multiplayer Arena
                </p>
                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                  ยินดีต้อนรับ {playerName}
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  ชวนเพื่อนมาหลบระเบิดในแชทร้อนระอุนี้ ใครพลาดพูดคำต้องห้ามคือผู้แพ้!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">จำนวนผู้เล่นต่อห้อง</p>
              <p className="text-2xl font-bold text-white">2 - {MAX_PLAYERS_PER_ROOM}</p>
              <p className="text-slate-400 text-xs mt-1">เหมาะกับทั้งกลุ่มเล็กและใหญ่</p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">ระยะเวลาแต่ละรอบ</p>
              <p className="text-2xl font-bold text-amber-300">10 นาที</p>
              <p className="text-slate-400 text-xs mt-1">เอาตัวรอดให้ครบเวลา</p>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">เงื่อนไขชนะ</p>
              <p className="text-2xl font-bold text-emerald-300">พูดไม่ซ้ำ</p>
              <p className="text-slate-400 text-xs mt-1">และอย่าพูดคำระเบิด!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Host Game Card */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl border border-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-cyan-500/20 opacity-60"></div>
          <div className="relative z-10 flex flex-col h-full gap-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg">
                <i className="fas fa-crown text-2xl text-yellow-300"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">สร้างห้อง</h3>
                <p className="text-slate-400 text-sm">ตั้งคำระเบิดลับ พร้อมคำใบ้สุดโหด</p>
              </div>
            </div>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <i className="fas fa-check text-emerald-400"></i>
                เลือกคำระเบิดและคำใบ้ได้อย่างอิสระ
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-check text-emerald-400"></i>
                พร้อมฟีเจอร์ปิดห้อง/รีเซ็ตในคลิกเดียว
              </li>
            </ul>
            <button
              onClick={onCreateRoom}
              className="mt-auto w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white font-semibold text-lg shadow-2xl hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3"
            >
              <i className="fas fa-plus-circle"></i>
              สร้างห้องใหม่
            </button>
          </div>
        </div>

        {/* Join Game Card */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl border border-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-tl from-cyan-600/20 via-blue-500/10 to-purple-500/20 opacity-60"></div>
          {isJoiningRoom && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
              <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-300 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold tracking-wide">กำลังเข้าร่วมห้อง...</p>
            </div>
          )}
          <div className="relative z-10 flex flex-col h-full gap-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <i className="fas fa-door-open text-2xl text-white"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">เข้าร่วมห้อง</h3>
                <p className="text-slate-400 text-sm">ใส่รหัส 6 หลักเพื่อร่วมวงสนทนา</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none">
                <i className="fas fa-hashtag text-lg"></i>
              </div>
              <input
                value={roomCode}
                onChange={(e) => onRoomCodeChange(e.target.value)}
                type="text"
                placeholder="000000"
                maxLength={6}
                className="w-full bg-slate-900/60 text-white text-center text-3xl tracking-[0.6em] pl-14 pr-4 py-5 rounded-2xl border-2 border-slate-700/60 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40 font-mono transition-all"
              />
            </div>
            <div className="text-slate-400 text-xs">
              ป้อนรหัสแล้วกด &ldquo;เข้าร่วมห้อง&rdquo; หรือรอระบบเชื่อมต่ออัตโนมัติ
            </div>
            <button
              onClick={!isJoiningRoom ? onJoinRoom : undefined}
              disabled={isJoiningRoom}
              className={`mt-auto w-full px-6 py-4 rounded-2xl text-white font-semibold text-lg border border-white/30 transition-all flex items-center justify-center gap-3 ${
                isJoiningRoom ? "bg-white/5 cursor-not-allowed opacity-70" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {isJoiningRoom ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>กำลังเชื่อมต่อ...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  เข้าห้องด้วยรหัส
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tips & Info */}
      <div className="surface-card rounded-3xl p-6 border border-slate-700/40 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-10 h-10 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <i className="fas fa-lightbulb text-yellow-300"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tips</p>
              <p className="text-xs text-slate-400">คุยกับเพื่อนให้เป็นธรรมชาติ แล้วล่อให้เขาพูดคำต้องห้าม</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm text-right w-full md:w-auto">
            รองรับทุกอุปกรณ์ | มีระบบโฮสต์สำรอง | แนะนำผู้เล่น 4-8 คน
          </p>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;

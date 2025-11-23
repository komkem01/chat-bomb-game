"use client";

import React from 'react';

interface MultiplayerScreenProps {
  playerName: string | null;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onResetProfile: () => void;
  onShowRules: () => void;
  onBack: () => void;
}

const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({
  playerName,
  roomCode,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
  onResetProfile,
  onShowRules,
  onBack,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col p-4 sm:p-6 lg:p-8 animate-slide-up">
      {/* Header */}
      <div className="surface-card rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all flex items-center justify-center border border-slate-700/50 hover:border-blue-500/50"
              title="กลับ"
            >
              <i className="fas fa-arrow-left text-base sm:text-lg"></i>
            </button>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center shadow-lg">
              <i className="fas fa-users text-xl sm:text-2xl text-white"></i>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                เล่นแบบกลุ่ม
              </h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="hidden sm:inline">Online as</span>
                <span className="text-white font-semibold text-sm sm:text-base">{playerName}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onShowRules}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all flex items-center justify-center border border-slate-700/50 hover:border-blue-500/50"
              title="กติกาการเล่น"
            >
              <i className="fas fa-book-open text-base sm:text-lg"></i>
            </button>
            <button
              onClick={onResetProfile}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center border border-slate-700/50 hover:border-red-500/50"
              title="ออกจากระบบ"
            >
              <i className="fas fa-sign-out-alt text-base sm:text-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 overflow-y-auto">
        {/* Host Game Card */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl relative overflow-hidden group shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-600/20 to-rose-500/20 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg">
                  <i className="fas fa-crown text-xl text-yellow-300"></i>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">สร้างห้อง</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">เป็นเจ้าของห้องและเริ่มเกมใหม่</p>
                </div>
              </div>
            </div>
            <button
              onClick={onCreateRoom}
              className="w-full bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all group border border-red-500/50"
            >
              <i className="fas fa-plus-circle text-xl"></i>
              <span>สร้างห้องใหม่</span>
              <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        </div>

        {/* Join Game Card */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl relative overflow-hidden group shadow-xl hover:shadow-2xl transition-all">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-rose-600/20 to-red-500/20 rounded-full -ml-20 -mb-20 blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
                  <i className="fas fa-users text-xl text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">เข้าร่วมห้อง</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">ใส่รหัสห้องเพื่อเข้าเล่น</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
                  <i className="fas fa-hashtag text-lg"></i>
                </div>
                <input
                  value={roomCode}
                  onChange={(e) => onRoomCodeChange(e.target.value)}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-slate-900/60 text-white text-center text-2xl sm:text-3xl pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-700/50 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 font-mono tracking-[0.5em] transition-all backdrop-blur-sm placeholder-slate-600"
                />
              </div>
              <button
                onClick={onJoinRoom}
                className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-red-600 hover:to-red-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all border border-slate-600/50 hover:border-red-500/50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 sm:w-auto w-full"
              >
                <i className="fas fa-door-open"></i>
                <span>เข้าห้อง</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center">
        <p className="text-slate-500 text-xs sm:text-sm">
          <i className="fas fa-info-circle mr-2"></i>
          รองรับการเล่นบนมือถือ แท็บเล็ต และคอมพิวเตอร์
        </p>
      </div>
    </div>
  );
};

export default MultiplayerScreen;
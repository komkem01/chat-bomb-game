"use client";

import React from 'react';

interface NameScreenProps {
  playerName: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

const NameScreen: React.FC<NameScreenProps> = ({ playerName, onNameChange, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 animate-slide-up">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl animate-glow"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center border border-blue-400/30 shadow-xl">
              <i className="fas fa-bomb text-5xl sm:text-6xl text-white drop-shadow-lg"></i>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent mb-3 tracking-tight">
            Chat Bomb
          </h1>
          <p className="text-slate-300 text-base sm:text-lg font-light tracking-wide">
            เกมคำระเบิด • Tactical Word Game
          </p>
        </div>
        
        <div className="surface-card p-6 sm:p-8 rounded-3xl shadow-2xl">
          <label className="block text-xs font-bold text-blue-300 uppercase tracking-widest mb-3">
            <i className="fas fa-user mr-2"></i>ชื่อผู้เล่น
          </label>
          <input
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            type="text"
            placeholder="กรอกชื่อของคุณ"
            className="w-full bg-slate-800/60 text-white text-lg rounded-2xl px-5 py-4 mb-6 border-2 border-slate-700/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-500 backdrop-blur-sm"
          />
          <button
            onClick={onSubmit}
            className="w-full btn-primary py-4 rounded-2xl font-semibold shadow-xl text-base uppercase tracking-wider hover:tracking-widest transition-all"
          >
            <i className="fas fa-rocket mr-2"></i>เริ่มเกม
          </button>
        </div>
        
        <p className="text-center text-slate-500 text-xs mt-6">
          พร้อมสนุกกับเกมแล้วหรือยัง?
        </p>
      </div>
    </div>
  );
};

export default NameScreen;

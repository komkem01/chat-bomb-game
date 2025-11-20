"use client";

import React, { RefObject } from 'react';
import { RoomData, DbMessage } from '@/types/game';

interface GameScreenProps {
  roomId: string;
  roomData: RoomData;
  userId: string;
  chatInput: string;
  onChatChange: (value: string) => void;
  onSendChat: () => void;
  onLeaveRoom: () => void;
  onCopyRoomCode: () => void;
  onOpenSetupModal: () => void;
  showSetupModal: boolean;
  onCloseSetupModal: () => void;
  bombWordInput: string;
  hintInput: string;
  onBombWordChange: (value: string) => void;
  onHintChange: (value: string) => void;
  onConfirmSetup: () => void;
  showConfirmModal: boolean;
  onOpenConfirmModal: () => void;
  onCloseConfirmModal: () => void;
  onConfirmCloseRoom: () => void;
  chatBoxRef: RefObject<HTMLDivElement>;
  onResetGame?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  roomId,
  roomData,
  userId,
  chatInput,
  onChatChange,
  onSendChat,
  onLeaveRoom,
  onCopyRoomCode,
  onOpenSetupModal,
  showSetupModal,
  onCloseSetupModal,
  bombWordInput,
  hintInput,
  onBombWordChange,
  onHintChange,
  onConfirmSetup,
  showConfirmModal,
  onOpenConfirmModal,
  onCloseConfirmModal,
  onConfirmCloseRoom,
  chatBoxRef,
  onResetGame,
}) => {
  const isOwner = roomData.room.owner_id === userId;
  const isSetter = roomData.room.setter_id === userId;
  const aliveCount = roomData.players?.filter((p) => !p.is_eliminated).length || 0;
  const deadCount = roomData.players?.filter((p) => p.is_eliminated).length || 0;
  const isEliminated = roomData.players?.some((p) => p.player_id === userId && p.is_eliminated);

  const renderMessages = () => {
    if (!roomData.messages) return null;
    return roomData.messages.map((msg: DbMessage) => {
      const isMe = msg.sender_id === userId;
      const bubbleClass = msg.is_boom
        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-2 border-red-400 shadow-xl'
        : isMe
        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
        : 'bg-slate-700/80 text-slate-100 border border-slate-600/50';
      const alignClass = isMe ? 'items-end' : 'items-start';

      return (
        <div key={msg.id} className={`flex flex-col w-full ${alignClass} mb-4 animate-slide-up`}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-xs sm:text-sm text-slate-400 font-semibold">{msg.sender_name}</span>
            {msg.is_boom && (
              <span className="text-[10px] bg-red-900/70 text-red-200 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border border-red-700/50 shadow-lg">
                <i className="fas fa-skull-crossbones mr-1"></i>ELIMINATED
              </span>
            )}
          </div>
          <div className={`px-4 sm:px-5 py-3 rounded-2xl max-w-[85%] sm:max-w-[75%] ${bubbleClass} text-sm sm:text-base leading-relaxed shadow-lg relative backdrop-blur-sm`}>
            {msg.message_text}
            {msg.is_boom && (
              <i className="fas fa-bomb absolute -top-4 -right-3 text-2xl sm:text-3xl text-red-500 drop-shadow-2xl animate-bounce"></i>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col w-full h-full max-w-4xl mx-auto relative bg-gradient-to-b from-slate-900/50 to-slate-800/50 md:border-x md:border-blue-500/20 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <header className="surface-card w-full px-4 sm:px-6 py-4 flex justify-between items-center z-20 border-b border-blue-500/20 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onLeaveRoom}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all border border-slate-700/50 hover:border-blue-500/50"
          >
            <i className="fas fa-chevron-left text-lg"></i>
          </button>
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-blue-500/50 to-transparent hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-blue-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <i className="fas fa-key text-[8px]"></i>
              Room ID
            </span>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={onCopyRoomCode}>
              <span className="font-mono text-base sm:text-lg text-blue-400 font-bold group-hover:text-blue-300 transition-colors">
                {roomId}
              </span>
              <i className="far fa-copy text-xs text-slate-500 group-hover:text-blue-400 transition-colors"></i>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            {roomData.room.status === 'IDLE' ? (
              <span className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                <i className="far fa-clock animate-pulse"></i>
                <span className="hidden sm:inline">รอตั้งค่าเกม</span>
              </span>
            ) : roomData.room.status === 'PLAYING' ? (
              isEliminated ? (
                <span className="text-red-400 font-semibold flex items-center gap-2 text-xs sm:text-sm">
                  <i className="fas fa-skull"></i>
                  <span className="hidden sm:inline">ELIMINATED</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-semibold animate-pulse-soft">
                  <i className="fas fa-circle text-[6px]"></i>
                  <span className="hidden sm:inline">กำลังเล่น</span>
                </span>
              )
            ) : null}
          </div>
          {isOwner && (
            <button
              onClick={onOpenConfirmModal}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs sm:text-sm font-semibold transition-all border border-red-500/30 hover:border-red-500/50 flex items-center gap-2"
            >
              <i className="fas fa-power-off"></i>
              <span className="hidden sm:inline">ปิดห้อง</span>
            </button>
          )}
        </div>
      </header>

      {/* Status Bar */}
      <div className="bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 border-b border-blue-500/20 px-4 sm:px-6 py-3 flex justify-between items-center backdrop-blur-sm z-10 shadow-lg">
        <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30" title="Survivors">
            <i className="fas fa-user-shield text-emerald-400"></i>
            <span className="text-emerald-300">{aliveCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30" title="Eliminated">
            <i className="fas fa-user-slash text-red-400"></i>
            <span className="text-red-300">{deadCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xs sm:text-sm text-blue-300 font-medium flex items-center gap-2">
            {roomData.room.status === 'IDLE' ? (
              <>
                <i className="fas fa-hourglass-half"></i>
                <span className="hidden sm:inline">รอเริ่มเกม...</span>
              </>
            ) : roomData.room.hint ? (
              <>
                <i className="fas fa-lightbulb text-yellow-400"></i>
                <span className="hidden sm:inline">คำใบ้:</span> {roomData.room.hint}
              </>
            ) : (
              <span className="hidden sm:inline">Initializing...</span>
            )}
          </div>
          {isSetter && roomData.room.status === 'PLAYING' && (
            <button
              onClick={onOpenSetupModal}
              className="px-2 sm:px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 transition-all text-xs"
            >
              <i className="fas fa-pen"></i>
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 scroll-smooth bg-gradient-to-b from-slate-900/20 to-transparent">
        {renderMessages()}
      </div>

      {/* Controls */}
      <div className="surface-card p-4 sm:p-6 border-t border-blue-500/20 z-20 shadow-2xl">
        {roomData.room.status === 'IDLE' && (
          <div className="flex justify-center mb-4">
            <button
              onClick={onOpenSetupModal}
              className="w-full btn-primary py-4 rounded-2xl font-semibold shadow-xl text-base sm:text-lg flex items-center justify-center gap-3 group"
            >
              <i className="fas fa-crosshairs text-xl"></i>
              <span>ตั้งค่าคำกับดัก</span>
              <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        )}

        <div
          className={`flex gap-2 sm:gap-3 ${
            roomData.room.status !== 'PLAYING' || isEliminated ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <input
            value={chatInput}
            onChange={(e) => onChatChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendChat()}
            type="text"
            placeholder={
              roomData.room.status !== 'PLAYING'
                ? 'รอผู้สร้างเริ่มเกม...'
                : isEliminated
                ? 'คุณถูกคัดออกแล้ว'
                : 'พิมพ์ข้อความ...'
            }
            className="flex-1 bg-slate-800/60 text-white text-sm sm:text-base rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border-2 border-slate-700/50 focus:border-blue-500/50 placeholder-slate-500 transition-all backdrop-blur-sm"
          />
          <button
            onClick={onSendChat}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <i className="fas fa-paper-plane text-base sm:text-lg"></i>
          </button>
        </div>

        {onResetGame && (
          <div className="flex justify-center mt-4">
            <button
              onClick={onResetGame}
              className="text-xs sm:text-sm text-slate-500 hover:text-blue-400 transition-colors px-4 py-2 rounded-lg hover:bg-blue-500/10"
            >
              <i className="fas fa-redo mr-2"></i>เริ่มรอบใหม่
            </button>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-slide-up">
          <div className="surface-card w-full max-w-md rounded-3xl p-6 sm:p-8 border-2 border-blue-500/30 shadow-2xl relative">
            <button
              onClick={onCloseSetupModal}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center border border-slate-700/50 hover:border-red-500/50"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-xl border border-blue-400/30">
                <i className="fas fa-cog text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {roomData.room.bomb_word ? 'แก้ไขข้อมูล' : 'ตั้งค่ากับดัก'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">กำหนดคำต้องห้ามและคำใบ้</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-bomb"></i>
                  คำกับดัก
                </label>
                <input
                  value={bombWordInput}
                  onChange={(e) => onBombWordChange(e.target.value)}
                  type="text"
                  placeholder="เช่น: สวัสดี"
                  className="w-full bg-slate-900/60 text-white text-lg rounded-2xl px-5 py-4 border-2 border-red-500/30 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all backdrop-blur-sm placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-lightbulb"></i>
                  คำใบ้
                </label>
                <input
                  value={hintInput}
                  onChange={(e) => onHintChange(e.target.value)}
                  type="text"
                  placeholder="เช่น: คำทักทาย"
                  className="w-full bg-slate-900/60 text-white text-lg rounded-2xl px-5 py-4 border-2 border-blue-500/30 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-sm placeholder-slate-600"
                />
              </div>
            </div>

            <button
              onClick={onConfirmSetup}
              className="w-full mt-8 btn-primary py-4 rounded-2xl font-semibold shadow-xl text-lg"
            >
              <i className="fas fa-check-circle mr-2"></i>ยืนยันการตั้งค่า
            </button>
          </div>
        </div>
      )}

      {/* Confirm Close Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-slide-up">
          <div className="surface-card w-full max-w-sm rounded-3xl p-6 sm:p-8 border-2 border-red-500/40 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-6 border-2 border-red-500/40 shadow-xl">
              <i className="fas fa-exclamation-triangle text-3xl"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">ปิดห้องใช่หรือไม่?</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-8 leading-relaxed">
              การกระทำนี้จะปิดห้องสำหรับทุกคน และไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCloseConfirmModal}
                className="flex-1 py-3 sm:py-4 rounded-2xl bg-slate-700/50 hover:bg-slate-600/50 text-white font-semibold transition-all border border-slate-600/50 hover:border-slate-500"
              >
                ยกเลิก
              </button>
              <button
                onClick={onConfirmCloseRoom}
                className="flex-1 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold transition-all shadow-xl hover:shadow-2xl"
              >
                <i className="fas fa-power-off mr-2"></i>ปิดห้อง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

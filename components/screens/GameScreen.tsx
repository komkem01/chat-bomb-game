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
  autoReturnCountdown?: number | null;
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
  autoReturnCountdown,
}) => {
  const isOwner = roomData.room.owner_id === userId;
  const aliveCount =
    roomData.players?.filter((p) => !p.is_eliminated).length || 0;
  const deadCount =
    roomData.players?.filter((p) => p.is_eliminated).length || 0;
  const isEliminated = roomData.players?.some(
    (p) => p.player_id === userId && p.is_eliminated
  );
  const podiumEntries = roomData.podium || [];
  const hasStartedGame = !!roomData.room.setter_id;
  const showPodium =
    roomData.room.status === "CLOSED" &&
    hasStartedGame &&
    podiumEntries.length > 0;
  const totalPlayers = roomData.players?.length || 0;
  const dangerPercentage =
    totalPlayers > 0 ? Math.round((deadCount / totalPlayers) * 100) : 0;

  const dangerMeta = (() => {
    if (dangerPercentage >= 66) {
      return {
        label: "ระวัง! อันตรายสูง",
        accent: "text-red-300",
        bar: "from-red-500 via-orange-500 to-amber-400",
        badge: "bg-red-500/20 border-red-500/40 text-red-100",
        icon: "fa-explosion",
        description: "เหลือผู้รอดชีวิตไม่มากแล้ว ทุกคำมีความเสี่ยงสูง!",
      };
    }
    if (dangerPercentage >= 33) {
      return {
        label: "เริ่มร้อนระอุ",
        accent: "text-amber-300",
        bar: "from-amber-500 via-orange-400 to-yellow-400",
        badge: "bg-amber-500/20 border-amber-500/40 text-amber-100",
        icon: "fa-fire-flame-curved",
        description: "มีคนถูกคัดออกไปแล้วหลายคน ระวังคำต้องห้ามให้ดี",
      };
    }
    return {
      label: "ยังชิลอยู่",
      accent: "text-emerald-300",
      bar: "from-emerald-500 via-emerald-400 to-cyan-400",
      badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-100",
      icon: "fa-shield-halved",
      description: "ยังเหลือผู้เล่นอีกเยอะ ลองหลอกเพื่อน ๆ ด้วยคำสร้างสรรค์!",
    };
  })();

  const recentEliminations = (
    roomData.messages?.filter((msg) => msg.is_boom) || []
  )
    .slice(-3)
    .reverse();

  const renderMessages = () => {
    if (!roomData.messages) return null;

    return roomData.messages.map((msg: DbMessage, index: number) => {
      const isMe = msg.sender_id === userId;
      const isEliminated = msg.is_boom;

      // Modern gradient styles with glassmorphism
      const bubbleClass = isEliminated
        ? "bg-gradient-to-br from-red-600/90 via-red-500/90 to-orange-600/90 text-white border-2 border-red-300/50 shadow-2xl shadow-red-500/30 backdrop-blur-xl"
        : isMe
        ? "bg-gradient-to-br from-blue-600/90 via-blue-500/90 to-cyan-500/90 text-white shadow-xl shadow-blue-500/20 backdrop-blur-xl border border-blue-300/20"
        : "bg-gradient-to-br from-slate-700/90 via-slate-600/90 to-slate-700/90 text-slate-50 border border-slate-500/30 shadow-lg shadow-slate-900/40 backdrop-blur-xl";

      const alignClass = isMe ? "items-end" : "items-start";
      const animationDelay = `${(index % 5) * 50}ms`;

      return (
        <div
          key={msg.id}
          className={`flex flex-col w-full ${alignClass} mb-3 sm:mb-4 animate-slide-up`}
          style={{ animationDelay }}
        >
          {/* Sender info with modern badge */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                isEliminated
                  ? "bg-gradient-to-br from-red-500 to-red-700 text-white ring-2 ring-red-300/50"
                  : isMe
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white ring-2 ring-blue-300/50"
                  : "bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200 ring-2 ring-slate-400/30"
              }`}
            >
              {msg.sender_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-300">
              {msg.sender_name}
            </span>
            {isEliminated && (
              <span className="text-[9px] sm:text-[10px] bg-gradient-to-r from-red-600 to-orange-600 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-wider shadow-lg border border-red-400/50 animate-pulse">
                <i className="fas fa-skull-crossbones mr-1"></i>OUT
              </span>
            )}
          </div>

          {/* Message bubble with modern design */}
          <div
            className={`
            group relative px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl 
            max-w-[85%] sm:max-w-[75%] ${bubbleClass} 
            text-sm sm:text-base leading-relaxed
            transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
            ${isEliminated ? "ring-2 ring-red-400/30 animate-pulse-slow" : ""}
          `}
          >
            {/* Glow effect for eliminated messages */}
            {isEliminated && (
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl -z-10 animate-pulse"></div>
            )}

            {/* Message text with better typography */}
            <p className="relative z-10 font-medium tracking-wide">
              {msg.message_text}
            </p>

            {/* Eliminated icon with animation */}
            {isEliminated && (
              <div className="absolute -top-5 -right-4 sm:-top-6 sm:-right-5">
                <div className="relative">
                  <i className="fas fa-bomb text-3xl sm:text-4xl text-red-400 drop-shadow-2xl animate-bounce"></i>
                  <div className="absolute inset-0 animate-ping">
                    <i className="fas fa-bomb text-3xl sm:text-4xl text-red-500/50"></i>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamp on hover */}
            <div className="absolute -bottom-5 right-0 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {new Date(msg.created_at).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Message reactions space (future feature) */}
          <div className="h-1"></div>
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
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={onCopyRoomCode}
            >
              <span className="font-mono text-base sm:text-lg text-blue-400 font-bold group-hover:text-blue-300 transition-colors">
                {roomId}
              </span>
              <i className="far fa-copy text-xs text-slate-500 group-hover:text-blue-400 transition-colors"></i>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            {roomData.room.status === "IDLE" ? (
              isOwner ? (
                <button
                  onClick={onOpenSetupModal}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/40 to-cyan-500/40 text-blue-200 hover:text-white border border-blue-500/40 hover:border-blue-400/60 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <i className="fas fa-crosshairs"></i>
                  <span>ตั้งค่าคำกับดัก</span>
                </button>
              ) : (
                <span className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                  <i className="fas fa-user-clock text-slate-500"></i>
                  <span>รอเจ้าของห้องตั้งค่าคำกับดัก</span>
                </span>
              )
            ) : roomData.room.status === "PLAYING" ? (
              <span className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold">
                <i className="fas fa-bolt"></i>
                <span className="hidden sm:inline">กำลังเล่น</span>
              </span>
            ) : roomData.room.status === "CLOSED" ? (
              <span className="flex items-center gap-2 text-yellow-300 text-xs sm:text-sm font-semibold">
                <i className="fas fa-flag-checkered"></i>
                <span className="hidden sm:inline">เกมจบแล้ว</span>
              </span>
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

      {/* Status Bar with modern indicators */}
      <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border-b border-blue-500/20 px-4 sm:px-6 py-3.5 flex justify-between items-center backdrop-blur-xl z-10 shadow-xl">
  <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm font-bold items-center flex-1">
          {/* Survivors badge */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-400/40 shadow-lg shadow-emerald-500/10 transition-all hover:scale-105"
            title="ผู้รอดชีวิต"
          >
            <div className="relative">
              <i className="fas fa-user-shield text-emerald-400"></i>
              {aliveCount > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <span className="text-emerald-300 font-black tabular-nums">
              {aliveCount}
            </span>
            <span className="hidden sm:inline text-emerald-400/70 text-[10px] uppercase tracking-wider">
              Alive
            </span>
          </div>

          {/* Eliminated badge */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/40 shadow-lg shadow-red-500/10 transition-all hover:scale-105"
            title="ถูกคัดออก"
          >
            <i className="fas fa-user-slash text-red-400"></i>
            <span className="text-red-300 font-black tabular-nums">
              {deadCount}
            </span>
            <span className="hidden sm:inline text-red-400/70 text-[10px] uppercase tracking-wider">
              Out
            </span>
          </div>

          {/* Total players */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/30 border border-slate-600/30">
            <i className="fas fa-users text-slate-400 text-xs"></i>
            <span className="text-slate-400 text-xs font-semibold">
              {roomData.players?.length || 0}/30
            </span>
          </div>
        </div>

        {/* Game status and hint */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xs sm:text-sm text-blue-300 font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
            {roomData.room.status === "IDLE" ? (
              <>
                <i className="fas fa-hourglass-half text-yellow-400 animate-pulse"></i>
                <span className="hidden sm:inline">รอเริ่มเกม...</span>
              </>
            ) : roomData.room.status === "CLOSED" ? (
              <>
                <i className="fas fa-flag-checkered text-yellow-300"></i>
                <span className="hidden sm:inline">เกมจบแล้ว</span>
              </>
            ) : roomData.room.hint ? (
              <>
                <i className="fas fa-lightbulb text-yellow-400 animate-pulse-soft"></i>
                <span className="hidden sm:inline font-semibold">คำใบ้:</span>
                <span className="max-w-[120px] sm:max-w-none truncate">
                  {roomData.room.hint}
                </span>
              </>
            ) : (
              <span className="hidden sm:inline text-slate-400">
                เกมกำลังดำเนินการ...
              </span>
            )}
          </div>

          {/* Edit button for setter */}
          {isOwner && roomData.room.status === "PLAYING" && (
            <button
              onClick={onOpenSetupModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-400 border border-blue-400/40 hover:border-blue-400/60 transition-all duration-300 text-xs group shadow-lg hover:shadow-xl"
              title="แก้ไขคำกับดัก"
            >
              <i className="fas fa-pen group-hover:rotate-12 transition-transform"></i>
            </button>
          )}
        </div>

        {/* Danger meter */}
        <div className="hidden lg:flex flex-col gap-2 text-xs sm:text-sm font-semibold text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className={`px-3 py-1 rounded-full border ${dangerMeta.badge}`}>
              <i className={`fas ${dangerMeta.icon} mr-1`}></i>
              โหมด: {dangerMeta.label}
            </span>
            <span className="text-slate-400 text-xs font-medium">
              Eliminated {deadCount}/{totalPlayers}
            </span>
          </div>
          <div className="w-64 h-3 rounded-full bg-slate-800/60 border border-slate-700/60 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${dangerMeta.bar} transition-all duration-500`}
              style={{ width: `${dangerPercentage}%` }}
            ></div>
          </div>
          <p className="text-slate-400 text-[11px] font-normal">
            {dangerMeta.description}
          </p>
        </div>
      </div>

      {/* Chat Area with modern scrollbar */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 scroll-smooth bg-gradient-to-b from-slate-900/30 via-slate-900/10 to-transparent
          scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-blue-500/30 hover:scrollbar-thumb-blue-500/50"
      >
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div
            className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        {/* Elimination highlights */}
        {roomData.room.status === "PLAYING" && recentEliminations.length > 0 && (
          <div className="relative z-10 mb-4">
            <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-red-200 text-sm font-semibold mb-2">
                <i className="fas fa-skull-crossbones animate-pulse"></i>
                <span>โดนคัดออกล่าสุด</span>
              </div>
              <div className="flex flex-col gap-2">
                {recentEliminations.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between text-xs sm:text-sm text-red-200">
                    <span className="font-bold">{msg.sender_name}</span>
                    <span className="text-red-300/70">{msg.message_text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10">{renderMessages()}</div>

        {/* Empty state */}
        {(!roomData.messages || roomData.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4 backdrop-blur-xl border border-blue-400/20 shadow-xl">
              <i className="fas fa-comments text-3xl text-blue-400/60"></i>
            </div>
            <p className="text-slate-400 text-sm sm:text-base font-medium">
              ไม่มีข้อความในห้อง
            </p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              เริ่มแชทเพื่อเล่นเกม!
            </p>
          </div>
        )}
      </div>

      {/* Controls with modern design */}
      <div className="surface-card p-4 sm:p-6 border-t border-blue-500/20 z-20 shadow-2xl backdrop-blur-2xl bg-gradient-to-b from-slate-900/95 to-slate-800/95">
        {roomData.room.status === "IDLE" && (
          <div className="flex justify-center mb-4">
            {isOwner ? (
              <button
                onClick={onOpenSetupModal}
                className="w-full btn-primary py-4 sm:py-5 rounded-2xl font-bold shadow-2xl text-base sm:text-lg flex items-center justify-center gap-3 group relative overflow-hidden
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                  before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000"
              >
                <i className="fas fa-crosshairs text-xl group-hover:rotate-90 transition-transform duration-500"></i>
                <span>ตั้งค่าคำกับดัก</span>
                <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
              </button>
            ) : (
              <div className="w-full px-4 py-4 rounded-2xl border border-slate-700/40 bg-slate-800/40 text-center text-slate-400 text-sm">
                รอเจ้าของห้องตั้งค่าคำกับดักก่อนเริ่มเกม
              </div>
            )}
          </div>
        )}

        <div
          className={`relative transition-all duration-300 ${
            roomData.room.status !== "PLAYING" || isEliminated
              ? "opacity-50 pointer-events-none"
              : ""
          }`}
        >
          {/* Input wrapper with glow effect */}
          <div className="relative flex gap-2 sm:gap-3">
            {/* Glow background on focus */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-600/20 rounded-3xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>

            {/* Text input with modern styling */}
            <div className="relative flex-1 group">
              <input
                value={chatInput}
                onChange={(e) => onChatChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && onSendChat()
                }
                type="text"
                maxLength={200}
                placeholder={
                  roomData.room.status === "CLOSED"
                    ? "เกมจบแล้ว - รอผู้ดูแลเปิดห้องใหม่"
                    : roomData.room.status !== "PLAYING"
                    ? "รอผู้สร้างเริ่มเกม..."
                    : isEliminated
                    ? "คุณถูกคัดออกแล้ว"
                    : "พิมพ์ข้อความ... (กด Enter เพื่อส่ง)"
                }
                className="w-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-white text-sm sm:text-base rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                  border-2 border-slate-700/50 focus:border-blue-500/70 
                  placeholder-slate-500 transition-all duration-300 backdrop-blur-xl
                  shadow-lg focus:shadow-2xl focus:shadow-blue-500/10
                  hover:border-slate-600/70"
              />

              {/* Character counter */}
              {chatInput.length > 0 && (
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono transition-colors
                  ${
                    chatInput.length > 180
                      ? "text-red-400"
                      : chatInput.length > 150
                      ? "text-yellow-400"
                      : "text-slate-500"
                  }`}
                >
                  {chatInput.length}/200
                </div>
              )}
            </div>

            {/* Send button with enhanced design */}
            <button
              onClick={onSendChat}
              disabled={!chatInput.trim()}
              className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 
                hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400
                disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed
                text-white w-12 sm:w-14 h-12 sm:h-14 rounded-2xl 
                flex items-center justify-center transition-all duration-300
                shadow-lg hover:shadow-2xl hover:shadow-blue-500/30
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:hover:scale-100
                group overflow-hidden
                border-2 border-blue-400/30 hover:border-blue-300/50"
            >
              {/* Pulse effect when enabled */}
              {chatInput.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <i className="fas fa-paper-plane text-base sm:text-lg relative z-10 group-hover:rotate-12 transition-transform duration-300"></i>
            </button>
          </div>

          {/* Hint text with duplicate warning */}
          {roomData.room.status === "PLAYING" && !isEliminated && (
            <div className="mt-2 px-1 space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-400/60"></i>
                <span>หลีกเลี่ยงคำกับดัก</span>
              </p>
              <p className="text-xs text-amber-500/80 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-amber-400/80"></i>
                <span className="font-semibold">ห้ามพิมพ์ข้อความซ้ำ</span>
                <span className="text-slate-500">- จะถูกคัดออกทันที!</span>
              </p>
            </div>
          )}
        </div>

        {onResetGame && roomData.room.status === "PLAYING" && (
          <div className="flex justify-center mt-4 pt-4 border-t border-slate-700/30">
            <button
              onClick={onResetGame}
              className="text-xs sm:text-sm text-slate-500 hover:text-blue-400 transition-all duration-300 px-4 py-2 rounded-xl hover:bg-blue-500/10 group flex items-center gap-2"
            >
              <i className="fas fa-redo group-hover:rotate-180 transition-transform duration-500"></i>
              <span>เริ่มรอบใหม่</span>
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
                  {roomData.room.bomb_word ? "แก้ไขข้อมูล" : "ตั้งค่ากับดัก"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  กำหนดคำต้องห้ามและคำใบ้
                </p>
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
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
              ปิดห้องใช่หรือไม่?
            </h3>
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

      {roomData.room.status === "CLOSED" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-4 py-10 bg-slate-950/90 backdrop-blur-xl">
          <div className="w-full max-w-3xl bg-gradient-to-b from-slate-900/90 to-slate-800/90 border border-blue-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300 font-semibold">
                เกมจบแล้ว
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-3">
                <i className="fas fa-trophy text-yellow-300"></i>
                โพเดียมผู้รอดชีวิต
              </h2>
              <p className="text-slate-400 text-sm">
                ผู้ที่อยู่ได้นานที่สุด 3 คนได้รับคะแนนพิเศษ
              </p>
              {!isOwner && autoReturnCountdown !== null && (
                <div className="text-amber-300 text-sm font-semibold">
                  ระบบจะพาคุณกลับ Lobby ใน {autoReturnCountdown} วินาที
                </div>
              )}
            </div>

            {showPodium ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {podiumEntries.map((entry) => (
                  <div
                    key={entry.playerId}
                    className={`relative rounded-3xl p-5 border shadow-xl flex flex-col items-center gap-2 ${
                      entry.position === 1
                        ? "bg-gradient-to-b from-yellow-400/30 to-yellow-600/20 border-yellow-300/40"
                        : entry.position === 2
                        ? "bg-gradient-to-b from-slate-200/20 to-slate-400/10 border-slate-200/40"
                        : "bg-gradient-to-b from-amber-700/20 to-amber-900/10 border-amber-500/30"
                    }`}
                  >
                    <div className="text-4xl">
                      {entry.position === 1
                        ? "🥇"
                        : entry.position === 2
                        ? "🥈"
                        : "🥉"}
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200">
                      อันดับ {entry.position}
                    </p>
                    <p className="text-lg font-bold text-white">
                      {entry.playerName}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        entry.status === "survivor"
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {entry.status === "survivor" ? "รอดชีวิต" : "ถูกคัดออก"}
                    </p>
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <i className="fas fa-star"></i>+{entry.points} คะแนน
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">
                {hasStartedGame ? "ยังไม่มีผู้ชนะ" : "ยังไม่มีคะแนน"}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onLeaveRoom}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                กลับ Lobby
              </button>
              {onResetGame && isOwner && (
                <button
                  onClick={onResetGame}
                  className="px-5 py-3 rounded-2xl border border-slate-600 text-slate-200 hover:border-blue-400 hover:text-white transition-all"
                >
                  รีเซ็ตเพื่อเริ่มใหม่
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

"use client";

import React from "react";
import { RelayRoomSummary } from "@/types/game";
import { MAX_PLAYERS_PER_ROOM } from "@/lib/constants";

interface RelayModalProps {
  isOpen: boolean;
  isLoading: boolean;
  rooms: RelayRoomSummary[];
  onClose: () => void;
  onRefresh: () => void;
  onQuickJoin: () => void;
  onSelectRoom: (roomId: string) => void;
  isJoining: boolean;
  joiningRoomId: string | null;
}

const RelayModal: React.FC<RelayModalProps> = ({
  isOpen,
  isLoading,
  rooms,
  onClose,
  onRefresh,
  onQuickJoin,
  onSelectRoom,
  isJoining,
  joiningRoomId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[96] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-blue-500/20 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <i className="fas fa-globe text-white text-lg"></i>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300 font-semibold">
                Cross-Lobby Relay
              </p>
              <h2 className="text-xl font-bold text-white">เชื่อมกับห้องอื่นที่กำลังออนไลน์</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800/70 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border border-slate-700/60 hover:border-red-400/50"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-slate-400 text-sm">
              เลือกห้องอื่นที่เปิดอยู่เพื่อเข้าไปแจมชั่วคราว ไม่ต้องออกจากห้องหลัก
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="px-4 py-2 rounded-2xl border border-slate-700/60 text-slate-200 text-sm hover:text-white hover:border-blue-400/60 disabled:opacity-60"
              >
                <i className="fas fa-rotate"></i>
                <span className="ml-2">รีเฟรช</span>
              </button>
              <button
                onClick={onQuickJoin}
                disabled={isJoining}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
              >
                {isJoining ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>กำลังสุ่ม...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-random"></i>
                    <span>สุ่มเข้าเร็ว</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1">
            {isLoading && rooms.length === 0 ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 animate-pulse space-y-3"
                >
                  <div className="h-4 bg-slate-800/80 rounded"></div>
                  <div className="h-3 bg-slate-800/80 rounded w-1/2"></div>
                  <div className="h-10 bg-slate-800/80 rounded"></div>
                </div>
              ))
            ) : rooms.length === 0 ? (
              <div className="col-span-full text-center text-slate-400 py-8 border border-dashed border-slate-700/60 rounded-2xl">
                <i className="fas fa-meteor text-3xl text-slate-600 mb-3"></i>
                <p className="text-sm">ยังไม่มีห้องไหนที่เปิดรับตอนนี้ ลองรีเฟรชหรือกลับมาภายหลัง</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.roomId}
                  className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/70 to-slate-900 p-4 shadow-lg flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">Room ID</p>
                      <p className="font-mono text-lg text-blue-300 font-semibold">{room.roomId}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        room.status === "PLAYING"
                          ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                          : "border-blue-400/40 text-blue-200 bg-blue-500/10"
                      }`}
                    >
                      {room.status === "PLAYING" ? "กำลังเล่น" : "กำลังเตรียม"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-users text-slate-500"></i>
                      <span>
                        {room.playerCount} / {MAX_PLAYERS_PER_ROOM}
                      </span>
                    </div>
                    {room.hint && (
                      <div className="flex items-center gap-2 text-yellow-300">
                        <i className="fas fa-lightbulb"></i>
                        <span className="truncate max-w-[120px]">{room.hint}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectRoom(room.roomId)}
                    disabled={isJoining}
                    className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      isJoining && joiningRoomId === room.roomId
                        ? "bg-blue-500/20 border-blue-400/40 text-blue-100"
                        : "border-blue-500/40 text-blue-200 hover:border-blue-300/60 hover:text-white"
                    }`}
                  >
                    {isJoining && joiningRoomId === room.roomId ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        <span>กำลังเชื่อมต่อ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt"></i>
                        <span>เข้าร่วม</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelayModal;

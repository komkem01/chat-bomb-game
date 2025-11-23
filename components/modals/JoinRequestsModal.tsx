"use client";

import React from "react";
import { RoomJoinRequest } from "@/types/game";

interface JoinRequestsModalProps {
  isOpen: boolean;
  isLoading: boolean;
  requests: RoomJoinRequest[];
  processingId: number | null;
  onRefresh: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onClose: () => void;
}

const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  isLoading,
  requests,
  processingId,
  onRefresh,
  onApprove,
  onReject,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[97] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-blue-500/20 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shadow-lg">
              <i className="fas fa-user-clock text-white text-lg"></i>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-green-300 font-semibold">คำขอเข้าร่วม</p>
              <h2 className="text-xl font-bold text-white">จัดการผู้เล่นที่ขอเข้าห้อง</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="w-10 h-10 rounded-xl bg-slate-800/70 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all border border-slate-700/60"
            >
              <i className="fas fa-rotate"></i>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/70 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border border-slate-700/60 hover:border-red-400/50"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="h-20 rounded-2xl border border-slate-800/60 bg-slate-900/50 animate-pulse"></div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="border border-dashed border-slate-700/60 rounded-2xl p-8 text-center text-slate-400">
              <i className="fas fa-person-circle-check text-4xl text-slate-600 mb-4"></i>
              <p>ยังไม่มีคำขอเข้าร่วมใหม่</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-white flex items-center gap-2">
                    <i className="fas fa-user"></i>
                    {request.playerName}
                  </p>
                  <p className="text-sm text-slate-400">ขอเข้าห้อง {request.roomId}</p>
                  <p className="text-xs text-slate-500">
                    ส่งเมื่อ {new Date(request.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onReject(request.id)}
                    disabled={processingId === request.id}
                    className="px-4 py-2 rounded-xl border border-red-400/40 text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    ปฏิเสธ
                  </button>
                  <button
                    onClick={() => onApprove(request.id)}
                    disabled={processingId === request.id}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
                  >
                    {processingId === request.id && (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    )}
                    <span>อนุมัติ</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRequestsModal;

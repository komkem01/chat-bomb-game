"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initializeSupabase,
  fetchPublicRooms,
  requestRoomJoin,
  fetchMyJoinRequests,
  addPlayerToRoom,
} from "@/lib/supabase";
import { JOIN_REQUEST_TIMEOUT_SECONDS } from "@/lib/constants";
import { PublicRoomSummary, RoomJoinRequest } from "@/types/game";

const REQUEST_REFRESH_INTERVAL_MS = 5000;
const ROOMS_PER_PAGE = 6;
const REQUEST_TIMEOUT_MS = JOIN_REQUEST_TIMEOUT_SECONDS * 1000;

const REQUEST_STATUS_LABELS: Record<RoomJoinRequest["status"], string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  DENIED: "ถูกปฏิเสธ",
  EXPIRED: "หมดเวลา",
};

const CommunityPage = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isRequestingRoomId, setIsRequestingRoomId] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [requestMap, setRequestMap] = useState<Record<string, RoomJoinRequest>>({});
  const requestsRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const roomsCountRef = useRef(0);
  const requestStatusRef = useRef<Record<string, RoomJoinRequest["status"]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingSecondsLeft, setPendingSecondsLeft] = useState<number | null>(null);

  const showToast = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    const bgClass =
      type === "error"
        ? "bg-gradient-to-r from-red-600 to-red-500 border-red-400/50 shadow-red-500/30"
        : type === "success"
        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/50 shadow-emerald-500/30"
        : "bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 shadow-blue-500/30";

    const icon = type === "error" ? "fa-triangle-exclamation" : type === "success" ? "fa-circle-check" : "fa-circle-info";

    toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 hover:scale-105`;
    toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove("translate-x-full"));

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-x-full", "scale-95");
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }, []);

  const clearRequestsRefreshTimer = useCallback(() => {
    if (requestsRefreshTimer.current) {
      clearInterval(requestsRefreshTimer.current);
      requestsRefreshTimer.current = null;
    }
  }, []);

  const refreshRooms = useCallback(async () => {
    if (!userId) return;
    setIsLoadingRooms((prev) => prev || roomsCountRef.current === 0);
    try {
      const roomList = await fetchPublicRooms(userId);
      setRooms(roomList);
      roomsCountRef.current = roomList.length;
    } catch (error: any) {
      console.error("Failed to fetch public rooms", error);
      showToast(error?.message || "โหลดรายชื่อห้องไม่สำเร็จ", "error");
    } finally {
      setIsLoadingRooms(false);
    }
  }, [showToast, userId]);

  const refreshRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const requests = await fetchMyJoinRequests(userId);
      const map = requests.reduce<Record<string, RoomJoinRequest>>((acc, req) => {
        acc[req.roomId] = req;
        return acc;
      }, {});
      setRequestMap(map);
    } catch (error) {
      console.error("Failed to fetch join requests", error);
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      try {
        const { userId: uid } = await initializeSupabase();
        const savedName = localStorage.getItem("chat_bomb_name");
        if (!savedName) {
          router.push("/");
          return;
        }
        setPlayerName(savedName);
        setUserId(uid);
      } catch (error) {
        console.error("init supabase failed", error);
        showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
        router.push("/");
      }
    };

    init();

    return () => {
      clearRequestsRefreshTimer();
    };
  }, [clearRequestsRefreshTimer, router, showToast]);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      await Promise.all([refreshRooms(), refreshRequests()]);
    };

    load();
    clearRequestsRefreshTimer();
    requestsRefreshTimer.current = setInterval(() => {
      void refreshRequests();
    }, REQUEST_REFRESH_INTERVAL_MS);

    return () => {
      clearRequestsRefreshTimer();
    };
  }, [clearRequestsRefreshTimer, refreshRequests, refreshRooms, userId]);

  const activePendingRequest = useMemo(() => {
    return Object.values(requestMap).find((req) => req.status === "PENDING") || null;
  }, [requestMap]);

  const activePendingRoomId = activePendingRequest?.roomId ?? null;

  const requestHistory = useMemo(() => {
    return Object.values(requestMap).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [requestMap]);

  useEffect(() => {
    const previousStatuses = requestStatusRef.current;
    Object.values(requestMap).forEach((req) => {
      if (previousStatuses[req.roomId] === "PENDING" && req.status === "EXPIRED") {
        showToast(`คำขอเข้าห้อง ${req.roomId} หมดเวลาแล้ว`, "error");
      }
    });

    requestStatusRef.current = Object.values(requestMap).reduce<Record<string, RoomJoinRequest["status"]>>((acc, req) => {
      acc[req.roomId] = req.status;
      return acc;
    }, {});
  }, [requestMap, showToast]);

  useEffect(() => {
    if (!activePendingRequest) {
      setPendingSecondsLeft(null);
      return;
    }

    const updateCountdown = () => {
      const createdAt = new Date(activePendingRequest.createdAt).getTime();
      const expiresAt = createdAt + REQUEST_TIMEOUT_MS;
      const remainingMs = Math.max(0, expiresAt - Date.now());
      setPendingSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 500);
    return () => clearInterval(countdownInterval);
  }, [activePendingRequest]);

  const totalPages = useMemo(() => {
    const computed = Math.ceil(rooms.length / ROOMS_PER_PAGE);
    return Math.max(computed || 1, 1);
  }, [rooms.length]);

  useEffect(() => {
    if (rooms.length === 0) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, rooms.length, totalPages]);

  const paginatedRooms = useMemo(() => {
    if (rooms.length === 0) return [];
    const start = (currentPage - 1) * ROOMS_PER_PAGE;
    return rooms.slice(start, start + ROOMS_PER_PAGE);
  }, [currentPage, rooms]);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleManualRefresh = useCallback(async () => {
    await refreshRooms();
    await refreshRequests();
  }, [refreshRequests, refreshRooms]);

  const pendingApprovedRoom = useMemo(() => {
    return Object.values(requestMap).find((req) => req.status === "APPROVED");
  }, [requestMap]);

  useEffect(() => {
    if (!pendingApprovedRoom || !playerName || !userId) {
      return;
    }

    const autoJoin = async () => {
      try {
        setJoiningRoomId(pendingApprovedRoom.roomId);
        await addPlayerToRoom(pendingApprovedRoom.roomId, userId, playerName);
        localStorage.setItem("chat_bomb_auto_join_room", pendingApprovedRoom.roomId);
        showToast(`ได้รับอนุญาตให้เข้าห้อง ${pendingApprovedRoom.roomId}`, "success");
        await refreshRequests();
        router.push("/multiplayer");
      } catch (error: any) {
        console.error("Failed to enter room after approval", error);
        showToast(error?.message || "ไม่สามารถเข้าสู่ห้องได้", "error");
      } finally {
        setJoiningRoomId(null);
      }
    };

    void autoJoin();
  }, [pendingApprovedRoom, playerName, refreshRequests, router, showToast, userId]);

  const handleRequestAccess = async (roomId: string) => {
    if (!userId || !playerName) {
      showToast("กรุณาตั้งชื่อก่อน", "error");
      router.push("/");
      return;
    }
    if (activePendingRoomId && activePendingRoomId !== roomId) {
      showToast(`คุณกำลังรอห้อง ${activePendingRoomId} อนุมัติอยู่ โปรดรอให้ครบ ${JOIN_REQUEST_TIMEOUT_SECONDS} วินาที`, "error");
      return;
    }

    if (activePendingRoomId === roomId) {
      showToast("คุณได้ส่งคำขอไปยังห้องนี้แล้ว โปรดรอคำตอบจากเจ้าของ", "info");
      return;
    }
    setIsRequestingRoomId(roomId);
    try {
      await requestRoomJoin(roomId, userId, playerName);
      showToast(`ส่งคำขอไปยังห้อง ${roomId} แล้ว`, "success");
      await refreshRequests();
      await refreshRooms();
    } catch (error: any) {
      console.error("Failed to request room", error);
      showToast(error?.message || "ไม่สามารถส่งคำขอได้", "error");
    } finally {
      setIsRequestingRoomId(null);
    }
  };

  const handleBackHome = () => {
    router.push("/");
  };

  const handleCreateRoom = () => {
    router.push("/multiplayer");
  };

  const renderRoomCard = (room: PublicRoomSummary) => {
  const request = requestMap[room.roomId];
  const isPending = request?.status === "PENDING" || room.hasPendingRequest;
    const isMember = room.isMember;
    const isJoining = joiningRoomId === room.roomId;
  const waitingOnAnotherRoom = Boolean(activePendingRoomId && activePendingRoomId !== room.roomId);
  const pendingBlocksJoin = isPending && !isMember;
  const waitingBlocksJoin = waitingOnAnotherRoom && !isMember;
  const disabledBase = pendingBlocksJoin || waitingBlocksJoin || isJoining;
  const isButtonDisabled = disabledBase || isRequestingRoomId === room.roomId;

    let actionLabel = "ขอเข้าร่วม";
    if (isJoining) {
      actionLabel = "กำลังเชื่อมต่อ...";
    } else if (isPending) {
      actionLabel = "รอเจ้าของอนุมัติ";
    } else if (waitingOnAnotherRoom && !isMember) {
      actionLabel = activePendingRoomId ? `รอห้อง ${activePendingRoomId}` : "รอการตอบกลับ";
    } else if (isMember) {
      actionLabel = "เข้าสู่ห้อง";
    }

    const occupancyLabel = `${room.playerCount}/${room.maxPlayers}`;

    return (
      <div
        key={room.roomId}
        className="rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/70 to-slate-900 p-6 shadow-lg flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-blue-300">ROOM ID</p>
            <p className="font-mono text-2xl text-blue-200 font-bold">{room.roomId}</p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
              room.status === "PLAYING"
                ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                : "border-amber-400/40 text-amber-200 bg-amber-500/10"
            }`}
          >
            {room.status === "PLAYING" ? "กำลังเล่น" : "กำลังเตรียม"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <i className="fas fa-users text-slate-500"></i>
            <span>{occupancyLabel}</span>
          </div>
          {room.hint && (
            <div className="flex items-center gap-2 text-yellow-300">
              <i className="fas fa-lightbulb"></i>
              <span className="truncate max-w-[140px]">{room.hint}</span>
            </div>
          )}
        </div>
        <div className="text-sm text-slate-400">
          <p>เจ้าของห้อง: <span className="text-slate-200 font-semibold">{room.ownerName || "ไม่ระบุ"}</span></p>
          {room.setterName && (
            <p>ผู้ออกคำล่าสุด: <span className="text-slate-200">{room.setterName}</span></p>
          )}
        </div>
        <button
          onClick={() => {
            if (isMember) {
              localStorage.setItem("chat_bomb_auto_join_room", room.roomId);
              router.push("/multiplayer");
              return;
            }
            handleRequestAccess(room.roomId);
          }}
          disabled={isButtonDisabled}
          className={`w-full py-3 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isMember
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400/60"
              : isPending
              ? "border-amber-400/40 text-amber-200 bg-amber-500/10"
              : "border-blue-500/40 text-blue-200 hover:border-blue-300/60 hover:text-white"
          } disabled:opacity-60`}
        >
          {isJoining && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
          <span>{actionLabel}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div
        id="toast-container"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]"
      ></div>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-blue-300 font-semibold">เล่นกับคนอื่น</p>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
              ห้องที่กำลังเปิดอยู่ตอนนี้
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              เลือกห้องที่คุณอยากแจม แล้วส่งคำขอให้เจ้าของอนุมัติ ก่อนเข้าสู่เกมจริง
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleBackHome}
              className="px-4 py-2.5 rounded-2xl border border-slate-700/60 text-slate-200 hover:text-white hover:border-blue-400/60"
            >
              <i className="fas fa-chevron-left mr-2"></i>
              กลับหน้าเลือกโหมด
            </button>
            <button
              onClick={handleCreateRoom}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold shadow-lg"
            >
              <i className="fas fa-plus mr-2"></i>
              สร้างห้องใหม่
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/60 bg-slate-900/40 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">สถานะคำขอล่าสุด</p>
            {requestHistory.length === 0 ? (
              <p className="text-slate-300 text-lg font-semibold">ยังไม่มีคำขอ</p>
            ) : (
              <>
                <p className="text-slate-200 text-lg font-semibold">
                  {requestHistory
                    .slice(0, 2)
                    .map((req) => `${req.roomId} (${REQUEST_STATUS_LABELS[req.status]})`)
                    .join(" • ")}
                </p>
                {activePendingRequest && (
                  <p className="text-amber-300 text-sm mt-1">
                    รอเจ้าของห้อง {activePendingRequest.roomId} อนุมัติภายใน {pendingSecondsLeft ?? JOIN_REQUEST_TIMEOUT_SECONDS} วินาที
                  </p>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => {
              void handleManualRefresh();
            }}
            className="px-3 py-2 rounded-2xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-blue-400/60"
          >
            <i className="fas fa-rotate"></i>
          </button>
        </div>

        {isLoadingRooms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="h-40 rounded-3xl border border-slate-800/60 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="border border-dashed border-slate-700/60 rounded-3xl p-10 text-center text-slate-400">
            <i className="fas fa-meteor text-4xl text-slate-600 mb-4"></i>
            <p>ยังไม่มีห้องที่เปิดอยู่ตอนนี้ ลองรีเฟรชหรือสร้างห้องใหม่ดูสิ</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedRooms.map(renderRoomCard)}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-slate-400">
                แสดง {paginatedRooms.length} ห้องจากทั้งหมด {rooms.length} ห้อง
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevPage}
                  disabled={!canGoPrev}
                  className="px-4 py-2 rounded-2xl border border-slate-700/60 text-slate-200 disabled:opacity-40"
                >
                  <i className="fas fa-chevron-left mr-2"></i>
                  ก่อนหน้า
                </button>
                <span className="text-slate-300 text-sm font-semibold">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!canGoNext}
                  className="px-4 py-2 rounded-2xl border border-slate-700/60 text-slate-200 disabled:opacity-40"
                >
                  ถัดไป
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;

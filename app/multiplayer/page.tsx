"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  initializeSupabase,
  createRoom,
  addPlayerToRoom,
  getRoomData,
  updateRoomSettings,
  sendMessage,
  closeRoom,
  resetGame,
  subscribeToRoom,
  fetchRelayRooms,
  requestRelayMatch,
  joinRelayRoom,
  returnRelayRoom,
  fetchOwnerJoinRequests,
  respondToJoinRequest,
} from "@/lib/supabase";
import {
  GameState,
  ToastType,
  RoomData,
  DbMessage,
  DbRoom,
  RelayRoomSummary,
  RelaySession,
  RoomJoinRequest,
} from "@/types/game";
import LobbyScreen from "@/components/screens/LobbyScreen";
import GameScreenComponent from "@/components/screens/GameScreen";
import RulesModal from "@/components/modals/RulesModal";
import RelayModal from "@/components/modals/RelayModal";
import JoinRequestsModal from "@/components/modals/JoinRequestsModal";

const FETCH_DEBOUNCE_MS = 50;
const REALTIME_KEEPALIVE_INTERVAL_MS = 4000;
const POLLING_FALLBACK_INTERVAL_MS = 1500;
const ROUND_DURATION_MS = 10 * 60 * 1000;

export default function MultiplayerPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"loading" | "lobby" | "game">("loading");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomData, setCurrentRoomData] = useState<RoomData | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [bombWordInput, setBombWordInput] = useState("");
  const [hintInput, setHintInput] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRelayModal, setShowRelayModal] = useState(false);
  const [relayRooms, setRelayRooms] = useState<RelayRoomSummary[]>([]);
  const [isRelayLoading, setIsRelayLoading] = useState(false);
  const [isRelayJoining, setIsRelayJoining] = useState(false);
  const [joiningRelayRoomId, setJoiningRelayRoomId] = useState<string | null>(null);
  const [relaySession, setRelaySession] = useState<RelaySession | null>(null);
  const [isReturningRelay, setIsReturningRelay] = useState(false);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<RoomJoinRequest[]>([]);
  const [isJoinRequestsLoading, setIsJoinRequestsLoading] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<number | null>(null);

  const unsubscribeRoomListener = useRef<{ unsubscribe: () => void } | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const roomFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoReturnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownCloseToastRef = useRef(false);
  const roomCodeLatestRef = useRef(roomCodeInput);
  const isJoiningRoomRef = useRef(false);
  const relayAutoReturnRef = useRef(false);

  const relayOriginRoomId = relaySession ? relaySession.originRoomId : currentRoomId;

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    
    const bgClass = type === "error"
      ? "bg-gradient-to-r from-red-600 to-red-500 border-red-400/50 shadow-red-500/30"
      : type === "success"
      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/50 shadow-emerald-500/30"
      : "bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 shadow-blue-500/30";

    const icon = type === "error"
        ? "fa-triangle-exclamation"
        : type === "success"
        ? "fa-circle-check"
        : "fa-circle-info";

    toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 hover:scale-105`;
    toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove("translate-x-full"));

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-x-full", "scale-95");
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }, []);

  const clearRoomPollInterval = useCallback(() => {
    if (roomPollIntervalRef.current) {
      clearInterval(roomPollIntervalRef.current);
      roomPollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { userId: uid } = await initializeSupabase();
        setUserId(uid);
        
        const savedName = localStorage.getItem("chat_bomb_name");
        if (!savedName) {
          router.push("/");
          return;
        }
        
        setPlayerName(savedName);
        setCurrentScreen("lobby");
      } catch (error) {
        console.error("Supabase initialization failed:", error);
        showToast("การเชื่อมต่อล้มเหลว", "error");
        router.push("/");
      }
    };

    init();
  }, [router, showToast]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [currentRoomData?.messages]);

  useEffect(() => {
    roomCodeLatestRef.current = roomCodeInput;
  }, [roomCodeInput]);

  useEffect(() => {
    return () => {
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
      }
      if (unsubscribeRoomListener.current) {
        unsubscribeRoomListener.current.unsubscribe();
      }
      clearRoomPollInterval();
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
      }
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
      }
    };
  }, [clearRoomPollInterval]);

  const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const leaveRoom = useCallback(() => {
    if (unsubscribeRoomListener.current) {
      unsubscribeRoomListener.current.unsubscribe();
      unsubscribeRoomListener.current = null;
    }
    clearRoomPollInterval();
    if (roomFetchTimeoutRef.current) {
      clearTimeout(roomFetchTimeoutRef.current);
      roomFetchTimeoutRef.current = null;
    }
    if (autoReturnIntervalRef.current) {
      clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    setAutoReturnCountdown(null);
    hasShownCloseToastRef.current = false;
    if (relaySession && userId) {
      void (async () => {
        try {
          await returnRelayRoom(relaySession.sessionId, userId);
        } catch (error) {
          console.error("Failed to cleanup relay session on leave", error);
        } finally {
          setRelaySession(null);
        }
      })();
    }
    setCurrentRoomId(null);
    setCurrentRoomData(null);
    setCurrentScreen("lobby");
    setChatInput("");
    setRoomCodeInput("");
  }, [clearRoomPollInterval, relaySession, userId]);

  const listenToRoom = useCallback(
    (roomId: string) => {
    if (unsubscribeRoomListener.current) {
      unsubscribeRoomListener.current.unsubscribe();
      unsubscribeRoomListener.current = null;
    }
    if (roomFetchTimeoutRef.current) {
      clearTimeout(roomFetchTimeoutRef.current);
      roomFetchTimeoutRef.current = null;
    }
    clearRoomPollInterval();
    setRealtimeConnected(false);

    let retryCount = 0;
    const MAX_RETRIES = 3;

    const scheduleRefresh = () => {
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
      }
      roomFetchTimeoutRef.current = setTimeout(() => {
        fetchSnapshot(false);
        roomFetchTimeoutRef.current = null;
      }, FETCH_DEBOUNCE_MS);
    };

    const fetchSnapshot = async (isInitialLoad = false) => {
      try {
        const data = await getRoomData(roomId);
        retryCount = 0;

        if (data.room.status === "CLOSED") {
          if (!hasShownCloseToastRef.current) {
            showToast("ห้องถูกปิดแล้ว! ดูโพเดียมได้เลย", "info");
            hasShownCloseToastRef.current = true;
          }
        } else if (hasShownCloseToastRef.current) {
          hasShownCloseToastRef.current = false;
        }

        setCurrentRoomData(data);
      } catch (error) {
        console.error("Error fetching room data:", error);

        if (isInitialLoad && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
          setTimeout(() => fetchSnapshot(true), 1000 * retryCount);
          return;
        }

        showToast("ไม่สามารถโหลดข้อมูลห้องได้", "error");
        leaveRoom();
      }
    };

    const startPolling = (intervalMs: number, reason: "keepalive" | "fallback") => {
      clearRoomPollInterval();
      roomPollIntervalRef.current = setInterval(() => {
        fetchSnapshot(false);
      }, intervalMs);
      console.info(
        reason === "keepalive"
          ? `📡 Realtime guard active: polling every ${intervalMs}ms for room ${roomId}`
          : `♻️ Polling fallback active: refreshing every ${intervalMs}ms for room ${roomId}`
      );
    };

    fetchSnapshot(true);

    const realtimeChannel = subscribeToRoom(roomId, () => {
      scheduleRefresh();
    });

    if (realtimeChannel) {
      console.info("✅ Subscribed to realtime updates for room", roomId);
      startPolling(REALTIME_KEEPALIVE_INTERVAL_MS, "keepalive");
      
      realtimeChannel.subscribe((status, err) => {
        console.log(`📡 Realtime status for room ${roomId}: ${status}`, err);
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          console.info(`✅ Realtime connected for room ${roomId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false);
          console.warn(`⚠️ Realtime disconnected for room ${roomId}:`, status, err);
        }
      });
      
      unsubscribeRoomListener.current = {
        unsubscribe: () => {
          realtimeChannel.unsubscribe();
          clearRoomPollInterval();
          setRealtimeConnected(false);
        },
      } as any;
    } else {
      console.warn(`⚠️ Realtime unavailable. Falling back to polling every ${POLLING_FALLBACK_INTERVAL_MS}ms`);
      setRealtimeConnected(false);
      startPolling(POLLING_FALLBACK_INTERVAL_MS, "fallback");

      unsubscribeRoomListener.current = {
        unsubscribe: () => {
          clearRoomPollInterval();
        },
      } as any;
    }
  },
    [clearRoomPollInterval, showToast, leaveRoom]
  );

  const enterGame = useCallback(
    (roomId: string) => {
      setCurrentRoomId(roomId);
      setCurrentScreen("game");
      relayAutoReturnRef.current = false;
      listenToRoom(roomId);
    },
    [listenToRoom]
  );

  const teardownRelaySession = useCallback(async () => {
    if (!relaySession || !userId) {
      return;
    }
    try {
      await returnRelayRoom(relaySession.sessionId, userId);
    } catch (error) {
      console.error("Failed to teardown relay session", error);
    } finally {
      setRelaySession(null);
    }
  }, [relaySession, userId]);

  const handleRelayReturnHome = useCallback(async () => {
    if (!relaySession || !userId) {
      return;
    }
    setIsReturningRelay(true);
    try {
      const payload = await returnRelayRoom(relaySession.sessionId, userId);
      setRelaySession(null);
      setShowRelayModal(false);
      setCurrentRoomData(payload.roomData);
      enterGame(payload.originRoomId);
      showToast("กลับสู่ห้องหลักแล้ว", "success");
    } catch (error: any) {
      console.error("Failed to return from relay", error);
      showToast(error?.message || "ไม่สามารถกลับห้องหลักได้", "error");
    } finally {
      relayAutoReturnRef.current = false;
      setIsReturningRelay(false);
    }
  }, [relaySession, userId, enterGame, showToast]);

  const refreshRelayRooms = useCallback(async () => {
    if (!userId || !relayOriginRoomId) {
      showToast("ต้องอยู่ในห้องหลักก่อน", "error");
      return;
    }
    setIsRelayLoading(true);
    try {
      const rooms = await fetchRelayRooms(relayOriginRoomId, userId);
      setRelayRooms(rooms);
    } catch (error: any) {
      console.error("Failed to load relay rooms", error);
      showToast(error?.message || "โหลดรายชื่อห้องไม่สำเร็จ", "error");
    } finally {
      setIsRelayLoading(false);
    }
  }, [userId, relayOriginRoomId, showToast]);

  const handleRelayQuickJoin = useCallback(async () => {
    if (!userId || !playerName || !relayOriginRoomId) {
      showToast("ต้องอยู่ในห้องหลักก่อน", "error");
      return;
    }
    setIsRelayJoining(true);
    setJoiningRelayRoomId(null);
    try {
      const payload = await requestRelayMatch(userId, playerName, relayOriginRoomId);
      setRelaySession(payload.session);
      setShowRelayModal(false);
      setCurrentRoomData(payload.roomData);
      enterGame(payload.session.targetRoomId);
      showToast(`เข้าร่วมห้อง ${payload.session.targetRoomId} สำเร็จ`, "success");
    } catch (error: any) {
      console.error("Failed to join random relay room", error);
      showToast(error?.message || "ไม่สามารถเชื่อมห้องอื่นได้", "error");
    } finally {
      setIsRelayJoining(false);
      setJoiningRelayRoomId(null);
    }
  }, [userId, playerName, relayOriginRoomId, enterGame, showToast]);

  const handleRelayRoomSelect = useCallback(
    async (targetRoomId: string) => {
      if (!userId || !playerName || !relayOriginRoomId) {
        showToast("ต้องอยู่ในห้องหลักก่อน", "error");
        return;
      }
      setIsRelayJoining(true);
      setJoiningRelayRoomId(targetRoomId);
      try {
        const payload = await joinRelayRoom(userId, playerName, relayOriginRoomId, targetRoomId);
        setRelaySession(payload.session);
        setShowRelayModal(false);
        setCurrentRoomData(payload.roomData);
        enterGame(payload.session.targetRoomId);
        showToast(`เข้าร่วมห้อง ${targetRoomId} สำเร็จ`, "success");
      } catch (error: any) {
        console.error("Failed to join selected relay room", error);
        showToast(error?.message || "ไม่สามารถเข้าห้องนี้ได้", "error");
      } finally {
        setIsRelayJoining(false);
        setJoiningRelayRoomId(null);
      }
    },
    [userId, playerName, relayOriginRoomId, enterGame, showToast]
  );

  const handleOpenRelayModal = useCallback(() => {
    if (!userId || !playerName || !relayOriginRoomId) {
      showToast("ต้องเข้าร่วมห้องหลักก่อน", "error");
      return;
    }
    if (relaySession) {
      showToast("คุณอยู่ในโหมด Guest อยู่แล้ว", "info");
      return;
    }
    setShowRelayModal(true);
    void refreshRelayRooms();
  }, [userId, playerName, relayOriginRoomId, relaySession, refreshRelayRooms, showToast]);

  const refreshJoinRequests = useCallback(async () => {
    if (!currentRoomId || !userId || currentRoomData?.room.owner_id !== userId) {
      return;
    }
    setIsJoinRequestsLoading(true);
    try {
      const requests = await fetchOwnerJoinRequests(currentRoomId, userId);
      setJoinRequests(requests);
    } catch (error: any) {
      console.error("Failed to fetch join requests", error);
      showToast(error?.message || "ไม่สามารถโหลดคำขอได้", "error");
    } finally {
      setIsJoinRequestsLoading(false);
    }
  }, [currentRoomData?.room.owner_id, currentRoomId, showToast, userId]);

  const handleOpenJoinRequests = useCallback(() => {
    if (!currentRoomId || !userId || currentRoomData?.room.owner_id !== userId) {
      showToast("เฉพาะเจ้าของห้องเท่านั้นที่ดูคำขอได้", "error");
      return;
    }
    setShowJoinRequestsModal(true);
    void refreshJoinRequests();
  }, [currentRoomData?.room.owner_id, currentRoomId, refreshJoinRequests, showToast, userId]);

  const respondJoinRequest = useCallback(
    async (requestId: number, decision: 'APPROVE' | 'DENY') => {
      if (!currentRoomId || !userId) {
        return;
      }
      setProcessingJoinRequestId(requestId);
      try {
        await respondToJoinRequest(requestId, userId, decision);
        showToast(
          decision === 'APPROVE' ? 'อนุมัติให้เข้าห้องแล้ว' : 'ปฏิเสธคำขอเรียบร้อย',
          decision === 'APPROVE' ? 'success' : 'info'
        );
        await refreshJoinRequests();
        const updated = await getRoomData(currentRoomId);
        setCurrentRoomData(updated);
      } catch (error: any) {
        console.error('Failed to respond join request', error);
        showToast(error?.message || 'จัดการคำขอไม่สำเร็จ', 'error');
      } finally {
        setProcessingJoinRequestId(null);
      }
    },
    [currentRoomId, refreshJoinRequests, showToast, userId]
  );

  const handleApproveJoinRequest = useCallback(
    (requestId: number) => respondJoinRequest(requestId, 'APPROVE'),
    [respondJoinRequest]
  );

  const handleRejectJoinRequest = useCallback(
    (requestId: number) => respondJoinRequest(requestId, 'DENY'),
    [respondJoinRequest]
  );

  useEffect(() => {
    return () => {
      if (relaySession) {
        void teardownRelaySession();
      }
    };
  }, [relaySession, teardownRelaySession]);

  useEffect(() => {
    if (!relaySession || !currentRoomId || !currentRoomData || !userId) {
      return;
    }

    const isGuestContext = currentRoomId === relaySession.targetRoomId;
    if (!isGuestContext) {
      return;
    }

    const isRoomClosed = currentRoomData.room.status === "CLOSED";
    const stillInRoom = currentRoomData.players?.some((p) => p.player_id === userId);

    if ((isRoomClosed || !stillInRoom) && !relayAutoReturnRef.current && !isReturningRelay) {
      relayAutoReturnRef.current = true;
      showToast("ห้องปลายทางปิดแล้ว กำลังกลับห้องหลัก", "info");
      void handleRelayReturnHome();
    }
  }, [
    relaySession,
    currentRoomId,
    currentRoomData,
    userId,
    handleRelayReturnHome,
    showToast,
    isReturningRelay,
  ]);

  const createRoomFunc = async () => {
    if (!userId || !playerName || isCreatingRoom) return;

    const newRoomId = generateRoomCode();

    try {
      setIsCreatingRoom(true);
      const roomData = await createRoom(newRoomId, userId, playerName);
      enterGame(roomData.room.room_id);
      showToast(`สร้างห้องสำเร็จ (รหัส ${roomData.room.room_id})`, "success");
    } catch (e) {
      console.error("Error creating room:", e);
      showToast("สร้างห้องไม่สำเร็จ", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const tryJoinRoom = useCallback(async (code: string) => {
    if (!userId || !playerName || isJoiningRoomRef.current) return;

    const sanitized = code.trim();
    if (sanitized.length !== 6) {
      showToast("รหัสห้องไม่ถูกต้อง", "error");
      return;
    }

    try {
      isJoiningRoomRef.current = true;
      setIsJoiningRoom(true);
      await addPlayerToRoom(sanitized, userId, playerName);
      enterGame(sanitized);
      showToast(`เข้าร่วมห้อง ${sanitized} สำเร็จ`, "success");
    } catch (error: any) {
      console.error("Error joining room:", error);
      showToast(error?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      isJoiningRoomRef.current = false;
      setIsJoiningRoom(false);
    }
  }, [enterGame, playerName, showToast, userId]);

  const joinRoomFunc = useCallback(
    (overrideCode?: string) => {
      const codeSource = typeof overrideCode === "string" ? overrideCode : roomCodeInput;
      void tryJoinRoom(codeSource);
    },
    [roomCodeInput, tryJoinRoom]
  );

  const handleRoomCodeChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 6);
    setRoomCodeInput(sanitized);
    if (sanitized.length === 6) {
      setTimeout(() => {
        if (roomCodeLatestRef.current === sanitized && !isJoiningRoomRef.current) {
          void tryJoinRoom(sanitized);
        }
      }, 300);
    }
  };

  const sendChatMessage = async () => {
    if (!userId || !playerName || !currentRoomId || !currentRoomData) return;
    if (currentRoomData.room.status !== "PLAYING") return;

    const text = chatInput.trim();
    if (!text) return;

    const isEliminated = currentRoomData.players?.some(
      (p) => p.player_id === userId && p.is_eliminated
    );
    if (isEliminated) {
      return showToast("คุณถูกตัดออกจากรอบนี้แล้ว", "error");
    }

    try {
      const updatedRoom = await sendMessage(currentRoomId, userId, playerName, text);
      setCurrentRoomData(updatedRoom);
      setChatInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("ไม่สามารถส่งข้อความได้", "error");
    }
  };

  const openSetupModal = () => {
    if (currentRoomData?.room.bomb_word) {
      setBombWordInput(currentRoomData.room.bomb_word);
      setHintInput(currentRoomData.room.hint || "");
    } else {
      setBombWordInput("");
      setHintInput("");
    }
    setShowSetupModal(true);
  };

  const setBombWord = async () => {
    if (!currentRoomId || !userId || !playerName) return;

    const word = bombWordInput.trim();
    const hint = hintInput.trim();
    if (!word) return showToast("กรุณาระบุคำต้องห้าม", "error");

    try {
      const roomData = await updateRoomSettings(currentRoomId, word, hint, userId, playerName);
      setCurrentRoomData(roomData);
      setShowSetupModal(false);
      showToast("ตั้งค่าเรียบร้อย", "success");
    } catch (error) {
      console.error("Error setting bomb word:", error);
      showToast("ไม่สามารถตั้งค่าได้", "error");
    }
  };

  const confirmCloseRoom = async () => {
    if (!currentRoomId || !userId) return;
    setShowConfirmModal(false);

    try {
      const closedRoom = await closeRoom(currentRoomId, userId);
      hasShownCloseToastRef.current = true;
      setCurrentRoomData(closedRoom);
      showToast("ปิดห้องเรียบร้อยแล้ว", "success");
    } catch (e) {
      console.error("Error closing room:", e);
      showToast("ไม่สามารถปิดห้องได้", "error");
    }
  };

  const resetGameFunc = async () => {
    if (!currentRoomId || !userId) return;
    try {
      const roomData = await resetGame(currentRoomId, userId);
      setCurrentRoomData(roomData);
      showToast("รีเซ็ตเกมแล้ว", "success");
    } catch (error) {
      console.error("Error resetting game:", error);
      showToast("ไม่สามารถรีเซ็ตเกมได้", "error");
    }
  };

  const copyRoomCode = () => {
    if (!currentRoomId) return;
    navigator.clipboard
      .writeText(currentRoomId)
      .then(() => showToast("คัดลอกรหัสห้องแล้ว", "success"));
  };

  const resetProfile = () => {
    localStorage.clear();
    router.push("/");
  };

  const goBackToModeSelect = () => {
    router.push("/");
  };

  useEffect(() => {
    if (!userId || !playerName) {
      return;
    }
    const autoJoinRoom = localStorage.getItem("chat_bomb_auto_join_room");
    if (autoJoinRoom) {
      localStorage.removeItem("chat_bomb_auto_join_room");
      void tryJoinRoom(autoJoinRoom);
    }
  }, [playerName, tryJoinRoom, userId]);

  // Auto-return countdown for non-owner when room is closed
  useEffect(() => {
    if (!currentRoomData || !userId) {
      if (autoReturnCountdown !== null) {
        setAutoReturnCountdown(null);
      }
      return;
    }

    const isOwner = currentRoomData.room.owner_id === userId;
    if (currentRoomData.room.status === "CLOSED" && !isOwner) {
      if (autoReturnCountdown === null) {
        setAutoReturnCountdown(20);
      }
    } else if (autoReturnCountdown !== null) {
      setAutoReturnCountdown(null);
    }
  }, [currentRoomData, userId, autoReturnCountdown]);

  useEffect(() => {
    if (autoReturnCountdown === null) {
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
      return;
    }

    if (autoReturnIntervalRef.current) {
      clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }

    autoReturnIntervalRef.current = setInterval(() => {
      setAutoReturnCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (autoReturnIntervalRef.current) {
            clearInterval(autoReturnIntervalRef.current);
            autoReturnIntervalRef.current = null;
          }
          showToast("กลับสู่ Lobby โดยอัตโนมัติ", "info");
          leaveRoom();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
    };
  }, [autoReturnCountdown, leaveRoom, showToast]);

  // Round timer
  useEffect(() => {
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    const roundStart = currentRoomData?.room.round_started_at;
    const roundStatus = currentRoomData?.room.status;

    if (!roundStart || roundStatus !== "PLAYING") {
      setRoundTimeLeft(null);
      return;
    }

    const endTime = new Date(roundStart).getTime() + ROUND_DURATION_MS;

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRoundTimeLeft(diff);
      
      if (diff <= 0 && roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
      }
    };

    updateCountdown();
    roundTimerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
      }
    };
  }, [currentRoomData?.room.round_started_at, currentRoomData?.room.status]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "loading":
        return (
          <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center transition-opacity">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-users text-2xl text-blue-500 animate-pulse"></i>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Multiplayer Mode
                </h2>
              </div>
              <p className="text-blue-400/80 text-sm tracking-[0.3em] font-semibold uppercase animate-pulse">
                Loading...
              </p>
            </div>
          </div>
        );

      case "lobby":
        return (
          <LobbyScreen
            playerName={playerName}
            roomCode={roomCodeInput}
            onRoomCodeChange={handleRoomCodeChange}
            onCreateRoom={createRoomFunc}
            onJoinRoom={joinRoomFunc}
            onResetProfile={resetProfile}
            isJoiningRoom={isJoiningRoom}
            onShowRules={(gameMode) => {
              if (gameMode === "multiplayer") {
                setShowRulesModal(true);
              } else {
                router.push("/solo");
              }
            }}
            onGoBack={goBackToModeSelect}
          />
        );

      case "game": {
        if (!currentRoomId || !currentRoomData || !userId) {
          return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">กำลังโหลดห้อง...</p>
            </div>
          );
        }
        const isRelayGuestContext = !!relaySession && currentRoomId === relaySession.targetRoomId;
        const canLaunchRelay =
          !relaySession && currentRoomData.room.status === "PLAYING" && currentRoomData.players?.length;
        return (
          <GameScreenComponent
            roomId={currentRoomId}
            roomData={currentRoomData}
            userId={userId}
            chatInput={chatInput}
            onChatChange={setChatInput}
            onSendChat={sendChatMessage}
            onLeaveRoom={leaveRoom}
            onCopyRoomCode={copyRoomCode}
            onOpenSetupModal={openSetupModal}
            showSetupModal={showSetupModal}
            onCloseSetupModal={() => setShowSetupModal(false)}
            bombWordInput={bombWordInput}
            hintInput={hintInput}
            onBombWordChange={setBombWordInput}
            onHintChange={setHintInput}
            onConfirmSetup={setBombWord}
            showConfirmModal={showConfirmModal}
            onOpenConfirmModal={() => setShowConfirmModal(true)}
            onCloseConfirmModal={() => setShowConfirmModal(false)}
            onConfirmCloseRoom={confirmCloseRoom}
            chatBoxRef={chatBoxRef}
            onResetGame={resetGameFunc}
            autoReturnCountdown={autoReturnCountdown}
            roundTimeLeft={roundTimeLeft}
            isSoloMode={false}
            realtimeConnected={realtimeConnected}
            onOpenRelayModal={handleOpenRelayModal}
            canRelay={!!canLaunchRelay}
            isRelayGuest={isRelayGuestContext}
            onReturnToOrigin={isRelayGuestContext ? handleRelayReturnHome : undefined}
            relaySession={relaySession}
            onOpenJoinRequests={handleOpenJoinRequests}
            pendingJoinRequestsCount={currentRoomData.pendingRequestsCount || 0}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      <div
        id="toast-container"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]"
      ></div>
      
      {isCreatingRoom && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6 transition-opacity">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.4s",
              }}
            ></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-200 text-lg font-semibold">
              กำลังสร้างห้องใหม่...
            </p>
            <p className="text-slate-400 text-sm">
              โปรดรอสักครู่ เพื่อหลีกเลี่ยงการสร้างห้องซ้ำ
            </p>
          </div>
        </div>
      )}

      <RulesModal
        mode="multiplayer"
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      <RelayModal
        isOpen={showRelayModal}
        isLoading={isRelayLoading}
        rooms={relayRooms}
        onClose={() => setShowRelayModal(false)}
        onRefresh={refreshRelayRooms}
        onQuickJoin={handleRelayQuickJoin}
        onSelectRoom={handleRelayRoomSelect}
        isJoining={isRelayJoining}
        joiningRoomId={joiningRelayRoomId}
      />

      <JoinRequestsModal
        isOpen={showJoinRequestsModal}
        isLoading={isJoinRequestsLoading}
        requests={joinRequests}
        processingId={processingJoinRequestId}
        onRefresh={() => void refreshJoinRequests()}
        onApprove={handleApproveJoinRequest}
        onReject={handleRejectJoinRequest}
        onClose={() => setShowJoinRequestsModal(false)}
      />

      {renderScreen()}
    </>
  );
}

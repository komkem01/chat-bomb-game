"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  GameState,
  GameScreen as GameScreenType,
  ToastType,
  RoomData,
  DbMessage,
  DbRoom,
} from "@/types/game";
import { SoloStats } from "@/types/solo";
import NameScreen from "@/components/screens/NameScreen";
import GameScreenComponent from "@/components/screens/GameScreen";
import SoloHomeScreen from "@/components/screens/SoloHomeScreen";
import { initializeSupabase } from "@/lib/supabase";
import { SOLO_BOT_PRESETS } from "@/lib/soloPresets";
import RulesModal from "@/components/modals/RulesModal";

const SOLO_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes to find the bomb word
const BOT_RESPONSE_DELAY = { min: 1200, max: 3000 };

const SOLO_DIFFICULTY_PROGRESSION = {
  BEGINNER: { turns: 0, trapChance: 0.15, hintLevel: 0.8, responseSpeed: 0.8 },
  INTERMEDIATE: { turns: 10, trapChance: 0.2, hintLevel: 0.6, responseSpeed: 1.0 },
  ADVANCED: { turns: 20, trapChance: 0.25, hintLevel: 0.4, responseSpeed: 1.2 },
  EXPERT: { turns: 30, trapChance: 0.3, hintLevel: 0.2, responseSpeed: 1.4 },
};

const COMBO_MULTIPLIERS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
const POWER_UPS = {
  HINT_REVEAL: { cost: 80, description: "เผยคำใบ้เพิ่มเติม" },
  SLOW_TIME: { cost: 120, description: "ชะลอบอทลง 50%" },
  SHIELD: { cost: 200, description: "ป้องกันคำซ้ำ 1 ครั้ง" },
  WORD_SCANNER: { cost: 150, description: "วิเคราะห์คำใบ้ให้ชัดเจน" },
};

const normalizeLocalText = (text: string) => text.trim().toLowerCase();

const generateClientId = (prefix: string) => {
  const randomSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomSuffix}`;
};

interface SoloSessionState {
  bombWord: string;
  hint: string;
  responses: string[];
  safeTurns: number;
  messageSeq: number;
  botName: string;
  score: number;
  combo: number;
  maxCombo: number;
  difficultyLevel: keyof typeof SOLO_DIFFICULTY_PROGRESSION;
  pressureLevel: number;
  powerUps: {
    hintReveal: number;
    slowTime: number;
    shield: number;
    wordScanner: number;
  };
  isSlowTime: boolean;
  shieldActive: boolean;
  streak: number;
  creativityBonus: number;
  trapWords: string[];
}

export default function SoloPracticePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>({
    userId: null,
    playerName: null,
    currentRoomId: null,
    currentRoomData: null,
    currentScreen: "loading",
    sessionType: "solo",
  });

  const [playerNameInput, setPlayerNameInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSetupModal] = useState(false);
  const [showConfirmModal] = useState(false);
  const [bombWordInput, setBombWordInput] = useState("");
  const [hintInput, setHintInput] = useState("");

  const chatBoxRef = useRef<HTMLDivElement>(null);
  const soloSessionRef = useRef<SoloSessionState | null>(null);
  const soloBotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getSoloStats = useCallback((): SoloStats => {
    const saved = localStorage.getItem("chat_bomb_solo_stats");
    if (!saved) {
      const defaultStats: SoloStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        bestScore: 0,
        totalScore: 0,
        averageScore: 0,
        bestTime: 0,
        totalTime: 0,
        averageTime: 0,
        longestCombo: 0,
        totalWordsFound: 0,
        achievements: [],
      };
      localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(defaultStats));
      return defaultStats;
    }
    return JSON.parse(saved);
  }, []);

  const updateSoloStats = useCallback(
    (
      gameResult: "win" | "lose",
      gameTime: number,
      score: number,
      maxCombo: number,
      wordsFound: number
    ) => {
      const stats = getSoloStats();
      stats.gamesPlayed += 1;
      if (gameResult === "win") {
        stats.gamesWon += 1;
      }
      stats.winRate = (stats.gamesWon / stats.gamesPlayed) * 100;

      stats.totalScore += score;
      stats.averageScore = Math.floor(stats.totalScore / stats.gamesPlayed);
      if (score > stats.bestScore) {
        stats.bestScore = score;
      }

      stats.totalTime += gameTime;
      stats.averageTime = Math.floor(stats.totalTime / stats.gamesPlayed);
      if (gameResult === "win" && (stats.bestTime === 0 || gameTime < stats.bestTime)) {
        stats.bestTime = gameTime;
      }

      if (maxCombo > stats.longestCombo) {
        stats.longestCombo = maxCombo;
      }

      stats.totalWordsFound += wordsFound;
      localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(stats));
      return stats;
    },
    [getSoloStats]
  );

  const showToast = useCallback((message: string, type: ToastType = "info", isCombo = false) => {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    const bgClass = isCombo && type === "success"
      ? "bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 border-orange-400/50 shadow-orange-500/50"
      : type === "error"
      ? "bg-gradient-to-r from-red-600 to-red-500 border-red-400/50 shadow-red-500/30"
      : type === "success"
      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/50 shadow-emerald-500/30"
      : "bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 shadow-blue-500/30";

    const icon =
      type === "error"
        ? "fa-triangle-exclamation"
        : type === "success"
        ? "fa-circle-check"
        : "fa-circle-info";

    toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 ${
      isCombo ? "hover:scale-110 animate-bounce" : "hover:scale-105"
    }`;
    toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove("translate-x-full"));

    const duration = isCombo ? 4500 : 3500;
    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-x-full", "scale-95");
      setTimeout(() => toast.remove(), 500);
    }, duration);
  }, []);

  const clearSoloBotTimer = useCallback(() => {
    if (soloBotTimeoutRef.current) {
      clearTimeout(soloBotTimeoutRef.current);
      soloBotTimeoutRef.current = null;
    }
  }, []);

  const resetSoloSession = useCallback(() => {
    clearSoloBotTimer();
    soloSessionRef.current = null;
  }, [clearSoloBotTimer]);

  const enterWithName = () => {
    const name = playerNameInput.trim();
    if (!name) return showToast("กรุณาระบุชื่อผู้ใช้งาน", "error");

    localStorage.setItem("chat_bomb_name", name);
    setGameState((prev) => ({ ...prev, playerName: name, currentScreen: "modeSelect" }));
  };

  const leaveRoom = useCallback(() => {
    resetSoloSession();
    setChatInput("");
    setRoundTimeLeft(null);
    setGameState((prev) => ({
      ...prev,
      currentRoomId: null,
      currentRoomData: null,
      currentScreen: "modeSelect",
    }));
  }, [resetSoloSession]);

  const getDifficultyLevel = (turns: number): keyof typeof SOLO_DIFFICULTY_PROGRESSION => {
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.EXPERT.turns) return "EXPERT";
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.ADVANCED.turns) return "ADVANCED";
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.INTERMEDIATE.turns) return "INTERMEDIATE";
    return "BEGINNER";
  };

  const addSoloBotMessage = () => {
    const session = soloSessionRef.current;
    if (!session || session.isSlowTime) return;

    const nowIso = new Date().toISOString();
    const difficulty = SOLO_DIFFICULTY_PROGRESSION[session.difficultyLevel];

    let messageTemplate;
    const randomValue = Math.random();
    if (randomValue < difficulty.hintLevel) {
      const helpfulHints = [
        `คำใบ้ใหม่: ${session.hint}`,
        `คำนี้มี ${session.bombWord.length} ตัวอักษร`,
        `เริ่มต้นด้วย "${session.bombWord.charAt(0).toUpperCase()}"`,
        `ลองคิดดู... ${session.hint.slice(0, 10)}...`,
      ];
      messageTemplate = helpfulHints[Math.floor(Math.random() * helpfulHints.length)];
    } else if (randomValue < difficulty.hintLevel + difficulty.trapChance) {
      const misleadingMessages = [
        "คิดได้แล้ว? หรือยังงงอยู่?",
        "ระวังนะ อย่าพูดคำผิด!",
        "มันง่ายกว่าที่คิดนะ... หรือไม่?",
        "ฉันรู้ว่าคุณรู้คำตอบแล้ว!",
      ];
      messageTemplate = misleadingMessages[Math.floor(Math.random() * misleadingMessages.length)];
      session.trapWords.push(messageTemplate);
    } else {
      const templateIndex = session.safeTurns % session.responses.length;
      messageTemplate = session.responses[templateIndex] ?? "ฉันยังรอให้คุณเผลออยู่เลยนะ";
    }

    const rendered = messageTemplate
      .replace("{hint}", session.hint)
      .replace("{length}", session.bombWord.length.toString())
      .replace("{score}", session.score.toString())
      .replace("{combo}", session.combo.toString());

    const botMessage: DbMessage = {
      id: `solo-msg-${session.messageSeq++}`,
      room_id: "SOLO",
      sender_id: "solo-bot",
      sender_name: `${session.botName} [Lv.${session.difficultyLevel}]`,
      message_text: rendered,
      is_boom: false,
      created_at: nowIso,
    } as DbMessage;

    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          messages: [...(prev.currentRoomData.messages ?? []), botMessage],
        },
      };
    });
  };

  const scheduleSoloBotResponse = () => {
    const session = soloSessionRef.current;
    if (!session) return;

    clearSoloBotTimer();
    const difficulty = SOLO_DIFFICULTY_PROGRESSION[session.difficultyLevel];
    const baseDelay =
      BOT_RESPONSE_DELAY.min + Math.random() * (BOT_RESPONSE_DELAY.max - BOT_RESPONSE_DELAY.min);
    const adjustedDelay = baseDelay / difficulty.responseSpeed;

    soloBotTimeoutRef.current = setTimeout(() => {
      addSoloBotMessage();
    }, adjustedDelay);
  };

  const completeSoloRound = useCallback((result: "success" | "fail") => {
    const sessionSnapshot = soloSessionRef.current;
    clearSoloBotTimer();

    if (sessionSnapshot) {
      const gameStartTime = new Date(
        gameState.currentRoomData?.room.round_started_at || Date.now()
      ).getTime();
      const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
      const wordsFound = sessionSnapshot.safeTurns;
      const updatedStats = updateSoloStats(
        result === "success" ? "win" : "lose",
        gameTime,
        sessionSnapshot.score,
        sessionSnapshot.maxCombo,
        wordsFound
      );

      const newAchievements: string[] = [];
      if (result === "success" && !updatedStats.achievements.includes("first_win")) {
        newAchievements.push("first_win");
        showToast("🏆 Achievement: First Victory!", "success");
      }
      if (sessionSnapshot.maxCombo >= 5 && !updatedStats.achievements.includes("combo_master")) {
        newAchievements.push("combo_master");
        showToast("🔥 Achievement: Combo Master!", "success");
      }
      if (result === "success" && gameTime < 120 && !updatedStats.achievements.includes("speed_runner")) {
        newAchievements.push("speed_runner");
        showToast("⚡ Achievement: Speed Runner!", "success");
      }
      if (
        result === "success" &&
        sessionSnapshot.combo === sessionSnapshot.safeTurns &&
        !updatedStats.achievements.includes("perfect_game")
      ) {
        newAchievements.push("perfect_game");
        showToast("💎 Achievement: Perfect Game!", "success");
      }

      if (newAchievements.length > 0) {
        const stats = getSoloStats();
        stats.achievements = [...stats.achievements, ...newAchievements];
        localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(stats));
      }
    }

    soloSessionRef.current = null;
    const nowIso = new Date().toISOString();
    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      const updatedRoom: DbRoom = {
        ...prev.currentRoomData.room,
        status: "CLOSED",
        updated_at: nowIso,
      };
      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          room: updatedRoom,
        },
      };
    });

    if (result === "success") {
      const bonusScore = (sessionSnapshot?.safeTurns ?? 0) * 50;
      const finalScore = (sessionSnapshot?.score ?? 0) + bonusScore;
      const maxCombo = sessionSnapshot?.maxCombo ?? 0;
      showToast(
        `🎉 ชนะแล้ว! คะแนนสุดท้าย: ${finalScore} | Max Combo: ${maxCombo}x | Victory Bonus: +${bonusScore}`,
        "success"
      );
    }
  }, [
    gameState.currentRoomData?.room.round_started_at,
    getSoloStats,
    showToast,
    updateSoloStats,
    clearSoloBotTimer,
  ]);

  const handleSoloPlayerMessage = () => {
    if (!gameState.playerName || !gameState.userId) return;
    const session = soloSessionRef.current;
    const roomData = gameState.currentRoomData;
    if (!session || !roomData || roomData.room.status !== "PLAYING") return;

    const text = chatInput.trim();
    if (!text) return;

    const normalized = normalizeLocalText(text);
    const isDuplicate = (roomData.messages ?? []).some(
      (msg) => normalizeLocalText(msg.message_text) === normalized
    );
    const isBoom = normalized === session.bombWord;
    const nowIso = new Date().toISOString();

    if (isBoom) {
      const finalScore = session.score + 1000;
      const playerMessage: DbMessage = {
        id: `solo-msg-${session.messageSeq++}`,
        room_id: "SOLO",
        sender_id: gameState.userId,
        sender_name: `${gameState.playerName} [${finalScore}pts]`,
        message_text: text,
        is_boom: false,
        created_at: nowIso,
      } as DbMessage;

      setGameState((prev) => {
        if (!prev.currentRoomData) return prev;
        const updatedRoom: DbRoom = {
          ...prev.currentRoomData.room,
          status: "CLOSED",
          updated_at: nowIso,
        };
        return {
          ...prev,
          currentRoomData: {
            ...prev.currentRoomData,
            room: updatedRoom,
            messages: [...(prev.currentRoomData.messages ?? []), playerMessage],
          },
        };
      });

      setChatInput("");
      showToast(`🎉 เจอแล้ว! "${text}" คือคำระเบิด! +1000 คะแนน`, "success");
      completeSoloRound("success");
      return;
    }

    let shouldEliminate = isDuplicate;
    if (shouldEliminate && session.shieldActive) {
      session.shieldActive = false;
      session.powerUps.shield = Math.max(0, session.powerUps.shield - 1);
      shouldEliminate = false;
      showToast("🛡️ Shield Protected! คุณรอดไปแล้ว!", "success");
    }

    if (!shouldEliminate) {
      session.combo++;
      session.streak++;
      session.maxCombo = Math.max(session.maxCombo, session.combo);

      const comboMultiplier =
        COMBO_MULTIPLIERS[
          Math.min(session.combo - 1, COMBO_MULTIPLIERS.length - 1)
        ];
      const baseScore = 5 + session.safeTurns * 1;
      let earnedScore = Math.floor(baseScore * comboMultiplier);
      if (session.creativityBonus > 0) {
        earnedScore = Math.floor(earnedScore * (1 + session.creativityBonus * 0.1));
      }
      session.score += earnedScore;

      const oldDifficulty = session.difficultyLevel;
      session.difficultyLevel = getDifficultyLevel(session.safeTurns);
      if (oldDifficulty !== session.difficultyLevel) {
        showToast(`⚡ ระดับความยากเพิ่มขึ้น: ${session.difficultyLevel}!`, "info");
      }

      if (session.combo > 1) {
        const comboEmoji =
          session.combo >= 10
            ? "🌟"
            : session.combo >= 7
            ? "💥"
            : session.combo >= 5
            ? "⚡"
            : session.combo >= 3
            ? "🔥"
            : "✨";
        const comboTitle =
          session.combo >= 10
            ? "LEGENDARY"
            : session.combo >= 7
            ? "AMAZING"
            : session.combo >= 5
            ? "FANTASTIC"
            : session.combo >= 3
            ? "GREAT"
            : "NICE";
        showToast(`${comboEmoji} ${comboTitle} ${session.combo}x Combo! +${earnedScore} คะแนน`, "success", true);
      }
    } else {
      if (session.combo > 2) {
        showToast(`💔 Combo Break! (จาก ${session.combo}x)`, "error");
      }
      session.combo = 0;
    }

    const playerMessage: DbMessage = {
      id: `solo-msg-${session.messageSeq++}`,
      room_id: "SOLO",
      sender_id: gameState.userId,
      sender_name: `${gameState.playerName} [${session.score}pts]`,
      message_text: text,
      is_boom: shouldEliminate,
      created_at: nowIso,
    } as DbMessage;

    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          messages: [...(prev.currentRoomData.messages ?? []), playerMessage],
        },
      };
    });

    setChatInput("");

    if (shouldEliminate) {
      const finalScore = session.score;
      const maxCombo = session.maxCombo;
      showToast(
        `Game Over! พูดคำซ้ำ คะแนนสุดท้าย: ${finalScore} | Max Combo: ${maxCombo}x`,
        "error"
      );
      completeSoloRound("fail");
      return;
    }

    session.safeTurns += 1;
    if (Math.random() < 0.02) {
      const powerUpTypes = Object.keys(POWER_UPS) as Array<keyof typeof POWER_UPS>;
      const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      if (randomPowerUp === "SHIELD") {
        session.powerUps.shield++;
        session.shieldActive = true;
        showToast("🛡️ Shield Power-up! ป้องกันการโดนออกครั้งถัดไป", "success");
      } else if (randomPowerUp === "SLOW_TIME") {
        session.isSlowTime = true;
        session.powerUps.slowTime++;
        showToast("⏰ Slow Time! บอทตอบช้าลงชั่วคราว", "success");
      } else if (randomPowerUp === "HINT_REVEAL") {
        session.powerUps.hintReveal++;
        showToast("💡 Hint Reveal! เผยคำใบ้เพิ่มเติม", "success");
      } else if (randomPowerUp === "WORD_SCANNER") {
        session.powerUps.wordScanner++;
        showToast("🔍 Word Scanner! ตรวจจับคำอันตราย", "success");
      }
    }

    scheduleSoloBotResponse();
  };

  const actualStartSoloMode = () => {
    if (!gameState.userId || !gameState.playerName) {
      return showToast("กรุณาตั้งชื่อก่อนเริ่มเล่นคนเดียว", "error");
    }

    const preset = SOLO_BOT_PRESETS[Math.floor(Math.random() * SOLO_BOT_PRESETS.length)];
    if (!preset) {
      return showToast("ไม่สามารถเลือกบอทได้", "error");
    }

    resetSoloSession();
    const normalizedWord = normalizeLocalText(preset.word);
    const nowIso = new Date().toISOString();

    soloSessionRef.current = {
      bombWord: normalizedWord,
      hint: preset.hint,
      responses: preset.responses,
      safeTurns: 0,
      messageSeq: 2,
      botName: preset.botName,
      score: 0,
      combo: 0,
      maxCombo: 0,
      difficultyLevel: "BEGINNER",
      pressureLevel: 0,
      powerUps: {
        hintReveal: 0,
        slowTime: 0,
        shield: 1,
        wordScanner: 0,
      },
      isSlowTime: false,
      shieldActive: true,
      streak: 0,
      creativityBonus: 0,
      trapWords: [],
    };

    const soloRoomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const soloRoom: RoomData = {
      room: {
        room_id: "SOLO",
        room_code: soloRoomCode,
        owner_id: gameState.userId,
        status: "PLAYING",
        bomb_word: normalizedWord,
        hint: preset.hint,
        setter_id: "solo-bot",
        setter_name: preset.botName,
        round_started_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      } as DbRoom,
      players: [
        {
          id: generateClientId("player"),
          room_id: "SOLO",
          player_id: gameState.userId,
          player_name: gameState.playerName,
          is_eliminated: false,
          is_guest: false,
          origin_room_id: null,
          joined_at: nowIso,
        },
        {
          id: generateClientId("player"),
          room_id: "SOLO",
          player_id: "solo-bot",
          player_name: preset.botName,
          is_eliminated: false,
          is_guest: false,
          origin_room_id: null,
          joined_at: nowIso,
        },
      ],
      messages: [
        {
          id: generateClientId("msg"),
          room_id: "SOLO",
          sender_id: "solo-bot",
          sender_name: preset.botName,
          message_text: preset.intro,
          is_boom: false,
          created_at: nowIso,
        },
      ],
    };

    setGameState((prev) => ({
      ...prev,
      sessionType: "solo",
      currentRoomId: "SOLO",
      currentRoomData: soloRoom,
      currentScreen: "game",
    }));

    setChatInput("");
    setRoundTimeLeft(Math.floor(SOLO_TIME_LIMIT / 1000));
    showToast(`เริ่มหาคำระเบิด! บอท: ${preset.botName}`, "info");
    scheduleSoloBotResponse();
  };

  const startSoloMode = () => {
    if (!gameState.playerName) {
      return showToast("กรุณาตั้งชื่อก่อน", "error");
    }
    setShowRulesModal(true);
  };

  const sendChatMessage = () => {
    if (!gameState.userId || !gameState.playerName) return;
    if (!gameState.currentRoomData || gameState.currentRoomData.room.status !== "PLAYING") return;
    handleSoloPlayerMessage();
  };

  const resetProfile = () => {
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { userId } = await initializeSupabase();
        const savedName = localStorage.getItem("chat_bomb_name");
        setGameState((prev) => ({
          ...prev,
          userId,
          playerName: savedName,
          currentScreen: savedName ? "modeSelect" : "name",
        }));
        if (savedName) {
          setPlayerNameInput(savedName);
        }
      } catch (error) {
        console.error("Supabase initialization failed:", error);
        showToast("การเชื่อมต่อล้มเหลว", "error");
      }
    };
    init();
  }, [showToast]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [gameState.currentRoomData?.messages]);

  useEffect(() => {
    return () => {
      clearSoloBotTimer();
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
      }
    };
  }, [clearSoloBotTimer]);

  useEffect(() => {
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    const roundStart = gameState.currentRoomData?.room.round_started_at;
    const roundStatus = gameState.currentRoomData?.room.status;

    if (!roundStart || roundStatus !== "PLAYING") {
      setRoundTimeLeft(null);
      return;
    }

    const endTime = new Date(roundStart).getTime() + SOLO_TIME_LIMIT;

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRoundTimeLeft(diff);
      if (diff === 60) {
        showToast("⚠️ เหลือเวลาอีก 1 นาที! รีบหาคำระเบิดให้เจอ", "info");
      } else if (diff === 30) {
        showToast("🚨 เหลือเวลาอีก 30 วินาที! เร่งด่วน!", "error");
      }
      if (diff <= 0 && roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
        completeSoloRound("fail");
        showToast("⏰ หมดเวลาแล้ว! คุณไม่สามารถหาคำระเบิดได้ทันเวลา", "error");
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
  }, [
    gameState.currentRoomData?.room.round_started_at,
    gameState.currentRoomData?.room.status,
    completeSoloRound,
    showToast,
  ]);

  const renderCurrentScreen = () => {
    switch (gameState.currentScreen) {
      case "loading":
        return (
          <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              ></div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-bomb text-2xl text-blue-500 animate-pulse"></i>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Chat Bomb Solo
                </h2>
              </div>
              <p className="text-blue-400/80 text-sm tracking-[0.3em] font-semibold uppercase animate-pulse">
                Loading...
              </p>
            </div>
          </div>
        );
      case "name":
        return (
          <NameScreen
            playerName={playerNameInput}
            onNameChange={setPlayerNameInput}
            onSubmit={enterWithName}
          />
        );
      case "modeSelect":
        return (
          <SoloHomeScreen
            playerName={gameState.playerName}
            soloStats={getSoloStats()}
            onStartGame={startSoloMode}
            onShowRules={() => setShowRulesModal(true)}
            onResetProfile={resetProfile}
            onGoBack={() => router.push("/")}
          />
        );
      case "game":
        if (!gameState.currentRoomId || !gameState.currentRoomData || !gameState.userId) {
          return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">กำลังโหลดห้อง...</p>
            </div>
          );
        }
        return (
          <GameScreenComponent
            roomId={gameState.currentRoomId}
            roomData={gameState.currentRoomData}
            userId={gameState.userId}
            chatInput={chatInput}
            onChatChange={setChatInput}
            onSendChat={sendChatMessage}
            onLeaveRoom={leaveRoom}
            onCopyRoomCode={() => showToast("โหมด Solo ไม่มีรหัสห้อง", "info")}
            onOpenSetupModal={() => showToast("โหมด Solo ไม่สามารถตั้งคำกับดักได้", "error")}
            showSetupModal={showSetupModal}
            onCloseSetupModal={() => null}
            bombWordInput={bombWordInput}
            hintInput={hintInput}
            onBombWordChange={setBombWordInput}
            onHintChange={setHintInput}
            onConfirmSetup={() => showToast("Solo Mode จัดการโดยบอทเท่านั้น", "error")}
            showConfirmModal={showConfirmModal}
            onOpenConfirmModal={() => null}
            onCloseConfirmModal={() => null}
            onConfirmCloseRoom={() => null}
            chatBoxRef={chatBoxRef}
            autoReturnCountdown={null}
            roundTimeLeft={roundTimeLeft}
            isSoloMode
            realtimeConnected={false}
            soloStats={soloSessionRef.current ? {
              score: soloSessionRef.current.score,
              combo: soloSessionRef.current.combo,
              maxCombo: soloSessionRef.current.maxCombo,
              difficultyLevel: soloSessionRef.current.difficultyLevel,
              pressureLevel: soloSessionRef.current.pressureLevel,
              powerUps: soloSessionRef.current.powerUps,
              shieldActive: soloSessionRef.current.shieldActive,
              isSlowTime: soloSessionRef.current.isSlowTime,
              creativityBonus: soloSessionRef.current.creativityBonus,
            } : undefined}
          />
        );
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
      {renderCurrentScreen()}
      <RulesModal
        mode="solo"
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onConfirm={() => {
          setShowRulesModal(false);
          actualStartSoloMode();
        }}
      />
    </>
  );
}

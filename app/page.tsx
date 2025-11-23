"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NameScreen from "@/components/screens/NameScreen";
import ModeSelectScreen from "@/components/screens/ModeSelectScreen";
import { SoloStats } from "@/types/solo";

export default function HomePage() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<"loading" | "name" | "modeSelect">("loading");
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerNameInput, setPlayerNameInput] = useState("");

  // Get solo stats for display in mode select
  const getSoloStats = (): SoloStats => {
    if (typeof window === "undefined") {
      return {
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
        achievements: []
      };
    }
    
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
        achievements: []
      };
      localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(defaultStats));
      return defaultStats;
    }
    return JSON.parse(saved);
  };

  useEffect(() => {
    // Check if user already has a name saved
    const savedName = localStorage.getItem("chat_bomb_name");
    if (savedName) {
      setPlayerName(savedName);
      setCurrentScreen("modeSelect");
    } else {
      setCurrentScreen("name");
    }
  }, []);

  const handleNameSubmit = () => {
    const name = playerNameInput.trim();
    if (!name) return;

    localStorage.setItem("chat_bomb_name", name);
    setPlayerName(name);
    setCurrentScreen("modeSelect");
  };

  const handleSelectSolo = () => {
    // Navigate to solo page
    router.push("/solo");
  };

  const handleSelectMultiplayer = () => {
    // Navigate to multiplayer page
    router.push("/multiplayer");
  };

  const handleSelectCommunity = () => {
    router.push("/community");
  };

  const handleResetProfile = () => {
    localStorage.clear();
    setPlayerName(null);
    setPlayerNameInput("");
    setCurrentScreen("name");
  };

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
                <i className="fas fa-bomb text-2xl text-blue-500 animate-pulse"></i>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Chat Bomb
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
            onSubmit={handleNameSubmit}
          />
        );

      case "modeSelect":
        return (
          <ModeSelectScreen
            playerName={playerName}
            soloStats={getSoloStats()}
            onSelectSolo={handleSelectSolo}
            onSelectMultiplayer={handleSelectMultiplayer}
            onSelectCommunity={handleSelectCommunity}
            onResetProfile={handleResetProfile}
          />
        );

      default:
        return null;
    }
  };

  return <>{renderScreen()}</>;
}

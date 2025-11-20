'use client';

import { useState, useEffect, useRef } from 'react';
import {
  initializeSupabase,
  createRoom,
  addPlayerToRoom,
  getRoomData,
  updateRoomSettings,
  sendMessage,
  closeRoom,
  resetGame,
} from '@/lib/supabase';
import { GameState, GameScreen as GameScreenType, ToastType } from '@/types/game';
import NameScreen from '@/components/screens/NameScreen';
import LobbyScreen from '@/components/screens/LobbyScreen';
import GameScreenComponent from '@/components/screens/GameScreen';

const FETCH_DEBOUNCE_MS = 120;

export default function ChatBombGame() {
    const [gameState, setGameState] = useState<GameState>({
      userId: null,
      playerName: null,
      currentRoomId: null,
      currentRoomData: null,
      currentScreen: 'loading',
    });

    const [playerNameInput, setPlayerNameInput] = useState('');
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [bombWordInput, setBombWordInput] = useState('');
    const [hintInput, setHintInput] = useState('');
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

  const unsubscribeRoomListener = useRef<{ unsubscribe: () => void } | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const roomFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownCloseToastRef = useRef(false);

    const showToast = (message: string, type: ToastType = 'info') => {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;

      const toast = document.createElement('div');
      const bgClass =
        type === 'error'
          ? 'bg-gradient-to-r from-red-600 to-red-500 border-red-400/50 shadow-red-500/30'
          : type === 'success'
          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/50 shadow-emerald-500/30'
          : 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 shadow-blue-500/30';

      const icon =
        type === 'error'
          ? 'fa-triangle-exclamation'
          : type === 'success'
          ? 'fa-circle-check'
          : 'fa-circle-info';

      toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 hover:scale-105`;
      toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

      toastContainer.appendChild(toast);
      requestAnimationFrame(() => toast.classList.remove('translate-x-full'));

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full', 'scale-95');
        setTimeout(() => toast.remove(), 500);
      }, 3500);
    };

    useEffect(() => {
      const init = async () => {
        try {
          const { userId } = await initializeSupabase();
          const savedName = localStorage.getItem('chat_bomb_name');
          setGameState((prev) => ({
            ...prev,
            userId,
            playerName: savedName,
            currentScreen: savedName ? 'lobby' : 'name',
          }));
        } catch (error) {
          console.error('Supabase initialization failed:', error);
          showToast('การเชื่อมต่อล้มเหลว', 'error');
        }
      };

      init();
    }, []);

    useEffect(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, [gameState.currentRoomData?.messages]);

    useEffect(() => {
      return () => {
        if (roomFetchTimeoutRef.current) {
          clearTimeout(roomFetchTimeoutRef.current);
        }
        if (unsubscribeRoomListener.current) {
          unsubscribeRoomListener.current.unsubscribe();
        }
      };
    }, []);

    const switchScreen = (screen: GameScreenType) => {
      setGameState((prev) => ({ ...prev, currentScreen: screen }));
    };

    const enterWithName = () => {
      const name = playerNameInput.trim();
      if (!name) return showToast('กรุณาระบุชื่อผู้ใช้งาน', 'error');

      localStorage.setItem('chat_bomb_name', name);
      setGameState((prev) => ({ ...prev, playerName: name }));
      switchScreen('lobby');
    };

    const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

    const createRoomFunc = async () => {
      if (!gameState.userId || !gameState.playerName) return;

      const newRoomId = generateRoomCode();

      try {
        const roomData = await createRoom(newRoomId, gameState.userId, gameState.playerName);
        enterGame(roomData.room.room_id);
        showToast(`สร้างห้องสำเร็จ (รหัส ${roomData.room.room_id})`, 'success');
      } catch (e) {
        console.error('Error creating room:', e);
        showToast('สร้างห้องไม่สำเร็จ', 'error');
      }
    };

    const enterGame = (roomId: string) => {
      setGameState((prev) => ({ ...prev, currentRoomId: roomId }));
      switchScreen('game');
      listenToRoom(roomId);
    };

    const leaveRoom = () => {
      if (unsubscribeRoomListener.current) {
        unsubscribeRoomListener.current.unsubscribe();
        unsubscribeRoomListener.current = null;
      }
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
        roomFetchTimeoutRef.current = null;
      }
      hasShownCloseToastRef.current = false;
      setGameState((prev) => ({
        ...prev,
        currentRoomId: null,
        currentRoomData: null,
      }));
      switchScreen('lobby');
      setChatInput('');
      setRoomCodeInput('');
    };

    const listenToRoom = (roomId: string) => {
      if (unsubscribeRoomListener.current) {
        unsubscribeRoomListener.current.unsubscribe();
        unsubscribeRoomListener.current = null;
      }
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
        roomFetchTimeoutRef.current = null;
      }

      let retryCount = 0;
      const MAX_RETRIES = 3;

      const fetchSnapshot = async (isInitialLoad = false) => {
        try {
          const data = await getRoomData(roomId);
          retryCount = 0; // Reset on success

          if (data.room.status === 'CLOSED') {
            if (!hasShownCloseToastRef.current) {
              showToast('ห้องถูกปิดแล้ว! ดูโพเดียมได้เลย', 'info');
              hasShownCloseToastRef.current = true;
            }
          } else if (hasShownCloseToastRef.current) {
            hasShownCloseToastRef.current = false;
          }

          setGameState((prev) => ({ ...prev, currentRoomData: data }));
        } catch (error) {
          console.error('Error fetching room data:', error);
          
          // Retry logic for initial load
          if (isInitialLoad && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(() => fetchSnapshot(true), 1000 * retryCount); // Progressive delay
            return;
          }
          
          // Show error and leave only after all retries failed
          showToast('ไม่สามารถโหลดข้อมูลห้องได้', 'error');
          leaveRoom();
        }
      };

      fetchSnapshot(true); // Initial load with retry

      // Always use polling - skip realtime entirely
      console.warn('⚠️ Using polling fallback (every 3s)');
      const pollInterval = setInterval(() => {
        fetchSnapshot(false);
      }, 3000);
      
      // Store cleanup in a pseudo-channel object
      unsubscribeRoomListener.current = {
        unsubscribe: () => clearInterval(pollInterval),
      } as any;
    };

    const openSetupModal = () => {
      if (gameState.currentRoomData?.room.bomb_word) {
        setBombWordInput(gameState.currentRoomData.room.bomb_word);
        setHintInput(gameState.currentRoomData.room.hint || '');
      } else {
        setBombWordInput('');
        setHintInput('');
      }
      setShowSetupModal(true);
    };

    const setBombWord = async () => {
      if (!gameState.currentRoomId || !gameState.userId || !gameState.playerName) return;

      const word = bombWordInput.trim();
      const hint = hintInput.trim();
      if (!word) return showToast('กรุณาระบุคำต้องห้าม', 'error');

      try {
        const roomData = await updateRoomSettings(
          gameState.currentRoomId,
          word,
          hint,
          gameState.userId,
          gameState.playerName
        );
        setGameState((prev) => ({
          ...prev,
          currentRoomData: roomData,
        }));
        setShowSetupModal(false);
        showToast('ตั้งค่าเรียบร้อย', 'success');
      } catch (error) {
        console.error('Error setting bomb word:', error);
        showToast('ไม่สามารถตั้งค่าได้', 'error');
      }
    };

    const joinRoomFunc = async (codeInput?: string) => {
      if (!gameState.userId || !gameState.playerName) return;

      const code = (codeInput ?? roomCodeInput).trim();
      if (code.length !== 6) return showToast('รหัสห้องไม่ถูกต้อง', 'error');

      try {
        await addPlayerToRoom(code, gameState.userId, gameState.playerName);
        enterGame(code);
      } catch (error: any) {
        console.error('Error joining room:', error);
        showToast(error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    };

    const sendChatMessage = async () => {
      if (!gameState.currentRoomId || !gameState.userId || !gameState.playerName) return;
      if (!gameState.currentRoomData || gameState.currentRoomData.room.status !== 'PLAYING') return;

      const text = chatInput.trim();
      if (!text) return;

      const isEliminated = gameState.currentRoomData.players?.some(
        (p) => p.player_id === gameState.userId && p.is_eliminated,
      );
      if (isEliminated) {
        return showToast('คุณถูกตัดออกจากรอบนี้แล้ว', 'error');
      }

      try {
        const updatedRoom = await sendMessage(gameState.currentRoomId, gameState.userId, gameState.playerName, text);
        setGameState((prev) => ({ ...prev, currentRoomData: updatedRoom }));
        setChatInput('');
      } catch (error) {
        console.error('Error sending message:', error);
        showToast('ไม่สามารถส่งข้อความได้', 'error');
      }
    };

    const confirmCloseRoom = async () => {
      if (!gameState.currentRoomId || !gameState.userId) return;
      setShowConfirmModal(false);

      try {
        const closedRoom = await closeRoom(gameState.currentRoomId, gameState.userId);
        hasShownCloseToastRef.current = true;
        setGameState((prev) => ({ ...prev, currentRoomData: closedRoom }));
        showToast('ปิดห้องเรียบร้อยแล้ว', 'success');
      } catch (e) {
        console.error('Error closing room:', e);
        showToast('ไม่สามารถปิดห้องได้', 'error');
      }
    };

    const copyRoomCode = () => {
      if (!gameState.currentRoomId) return;
      navigator.clipboard.writeText(gameState.currentRoomId).then(() => showToast('คัดลอกรหัสห้องแล้ว', 'success'));
    };

    const resetGameFunc = async () => {
      if (!gameState.currentRoomId || !gameState.userId) return;
      try {
        const roomData = await resetGame(gameState.currentRoomId, gameState.userId);
        setGameState((prev) => ({ ...prev, currentRoomData: roomData }));
        showToast('รีเซ็ตเกมแล้ว', 'success');
      } catch (error) {
        console.error('Error resetting game:', error);
        showToast('ไม่สามารถรีเซ็ตเกมได้', 'error');
      }
    };

    const handleRoomCodeChange = (value: string) => {
      const sanitized = value.replace(/\D/g, '').slice(0, 6);
      setRoomCodeInput(sanitized);
      if (sanitized.length === 6) {
        setTimeout(() => joinRoomFunc(sanitized), 300);
      }
    };

    const resetProfile = () => {
      localStorage.clear();
      window.location.reload();
    };

    const renderCurrentScreen = () => {
      switch (gameState.currentScreen) {
        case 'loading':
          return (
            <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center transition-opacity">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
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
        case 'name':
          return <NameScreen playerName={playerNameInput} onNameChange={setPlayerNameInput} onSubmit={enterWithName} />;
        case 'lobby':
          return (
            <LobbyScreen
              playerName={gameState.playerName}
              roomCode={roomCodeInput}
              onRoomCodeChange={handleRoomCodeChange}
              onCreateRoom={createRoomFunc}
              onJoinRoom={() => joinRoomFunc()}
              onResetProfile={resetProfile}
            />
          );
        case 'game':
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
            />
          );
        default:
          return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">กำลังโหลด...</p>
            </div>
          );
      }
    };

    return (
      <>
        <div id="toast-container" className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]"></div>
        {renderCurrentScreen()}
      </>
    );
  }
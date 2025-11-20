import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { RoomData } from '@/types/game';

// Supabase configuration (injected at build time for browser use)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ต้องถูกตั้งค่าใน Environment');
}

let supabase: SupabaseClient<Database>;
let currentUserId: string | null = null;

export const initializeSupabase = async (): Promise<{ supabase: SupabaseClient<Database>; userId: string }> => {
  // Initialize Supabase client once per application lifecycle
  if (!supabase) {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // Reuse persisted anonymous user id so server-side ownership checks keep working after refresh
  if (typeof window !== 'undefined') {
    const storedId = window.localStorage.getItem('chat_bomb_user_id');
    if (storedId) {
      currentUserId = storedId;
    } else {
      currentUserId = generateUserId();
      window.localStorage.setItem('chat_bomb_user_id', currentUserId);
    }
  } else {
    currentUserId = generateUserId();
  }

  return { supabase, userId: currentUserId };
};

const generateUserId = (): string => {
  return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

type ApiResponse<T> = { data: T };

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = (await response.json()) as ApiResponse<T> & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload.data;
};

export const createRoom = async (roomId: string, ownerId: string, ownerName: string) => {
  return apiFetch<RoomData>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ roomId, ownerId, ownerName }),
  });
};

export const addPlayerToRoom = async (roomId: string, playerId: string, playerName: string) => {
  return apiFetch<RoomData>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomId, playerId, playerName }),
  });
};

export const getRoomData = async (roomId: string) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}`);
};

export const updateRoomSettings = async (
  roomId: string,
  bombWord: string,
  hint: string,
  setterId: string,
  setterName: string
) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}/settings`, {
    method: 'POST',
    body: JSON.stringify({ setterId, setterName, bombWord, hint }),
  });
};

export const sendMessage = async (
  roomId: string,
  senderId: string,
  senderName: string,
  text: string
) => {
  return apiFetch<RoomData>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ roomId, senderId, senderName, text }),
  });
};

export const closeRoom = async (roomId: string, ownerId: string) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}/close`, {
    method: 'POST',
    body: JSON.stringify({ ownerId }),
  });
};

export const subscribeToRoom = (
  roomId: string, 
  callback: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`room_${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_players',
        filter: `room_id=eq.${roomId}`,
      },
      callback
    )
    .subscribe();

  return channel;
};

export const resetGame = async (roomId: string, ownerId: string) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}/reset`, {
    method: 'POST',
    body: JSON.stringify({ ownerId }),
  });
};

export { supabase, currentUserId };
export type { SupabaseClient, RealtimeChannel };
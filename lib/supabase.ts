import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { RoomData } from '@/types/game';

// Supabase configuration (injected at build time for browser use)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Graceful fallback with warning instead of throwing
const hasSupabaseConfig = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (typeof window !== 'undefined' && !hasSupabaseConfig) {
  console.warn('⚠️ Supabase environment variables not configured. Realtime features will be disabled.');
}

let supabase: SupabaseClient<Database> | null = null;
let currentUserId: string | null = null;

export const initializeSupabase = async (): Promise<{ supabase: SupabaseClient<Database> | null; userId: string }> => {
  // Initialize Supabase client once per application lifecycle
  if (!supabase && hasSupabaseConfig) {
    try {
      supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        realtime: {
          params: {
            eventsPerSecond: 2
          }
        },
        global: {
          headers: {
            'x-client-info': 'chat-bomb-game'
          }
        }
      });
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
    }
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
  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(path, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      signal: controller.signal,
      ...init,
    });

    clearTimeout(timeoutId);

    const payload = (await response.json()) as ApiResponse<T> & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `Request failed with status ${response.status}`);
    }

    return payload.data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
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
): RealtimeChannel | null => {
  // Disable realtime entirely - always use polling fallback
  console.warn('⚠️ Realtime disabled. Using polling fallback (every 3s)');
  return null;

  /* Original realtime code - commented out
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized. Realtime disabled. Using polling fallback.');
    return null;
  }

  try {
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

    console.log(`✅ Subscribed to room ${roomId}`);
    return channel;
  } catch (error) {
    console.error('❌ Failed to subscribe to room:', error);
    return null;
  }
  */
};

export const resetGame = async (roomId: string, ownerId: string) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}/reset`, {
    method: 'POST',
    body: JSON.stringify({ ownerId }),
  });
};

export { supabase, currentUserId };
export type { SupabaseClient, RealtimeChannel };
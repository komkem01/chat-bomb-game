import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { RoomData, RelayRoomSummary, RelaySession, PublicRoomSummary, RoomJoinRequest } from '@/types/game';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    if (storedId && UUID_REGEX.test(storedId)) {
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
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized. Realtime disabled. Using polling fallback.');
    return null;
  }

  try {
    const channel = supabase
      .channel(`room_${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('📡 Room change detected:', payload);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('📡 Message change detected:', payload);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('📡 Player change detected:', payload);
          callback(payload);
        }
      );

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.info(`✅ Realtime sync active for room ${roomId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Realtime channel error for room ${roomId}:`, err);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱️ Realtime subscription timed out for room ${roomId}`);
      } else {
        console.log(`📡 Realtime status: ${status}`);
      }
    });

    return channel;
  } catch (error) {
    console.error('❌ Failed to subscribe to room:', error);
    return null;
  }
};

export const resetGame = async (roomId: string, ownerId: string) => {
  return apiFetch<RoomData>(`/api/rooms/${roomId}/reset`, {
    method: 'POST',
    body: JSON.stringify({ ownerId }),
  });
};

interface RelayJoinResponse {
  session: RelaySession;
  roomData: RoomData;
}

interface RelayReturnResponse {
  originRoomId: string;
  roomData: RoomData;
}

export const fetchRelayRooms = async (originRoomId: string, playerId: string) => {
  const params = new URLSearchParams({ originRoomId, playerId });
  const response = await apiFetch<{ rooms: RelayRoomSummary[] }>(`/api/relay/rooms?${params.toString()}`);
  return response.rooms;
};

export const requestRelayMatch = async (playerId: string, playerName: string, originRoomId: string) => {
  return apiFetch<RelayJoinResponse>('/api/relay/match', {
    method: 'POST',
    body: JSON.stringify({ playerId, playerName, originRoomId }),
  });
};

export const joinRelayRoom = async (
  playerId: string,
  playerName: string,
  originRoomId: string,
  targetRoomId: string
) => {
  return apiFetch<RelayJoinResponse>('/api/relay/join', {
    method: 'POST',
    body: JSON.stringify({ playerId, playerName, originRoomId, targetRoomId }),
  });
};

export const returnRelayRoom = async (sessionId: string, playerId: string) => {
  return apiFetch<RelayReturnResponse>('/api/relay/return', {
    method: 'POST',
    body: JSON.stringify({ sessionId, playerId }),
  });
};

export const fetchPublicRooms = async (playerId?: string) => {
  const params = new URLSearchParams();
  if (playerId) {
    params.set('playerId', playerId);
  }
  const queryString = params.toString();
  const response = await apiFetch<{ rooms: PublicRoomSummary[] }>(
    `/api/rooms/public${queryString ? `?${queryString}` : ''}`
  );
  return response.rooms;
};

export const requestRoomJoin = async (roomId: string, playerId: string, playerName: string) => {
  return apiFetch<RoomJoinRequest>('/api/rooms/join/request', {
    method: 'POST',
    body: JSON.stringify({ roomId, playerId, playerName }),
  });
};

export const fetchMyJoinRequests = async (playerId: string) => {
  const response = await apiFetch<{ requests: RoomJoinRequest[] }>(
    `/api/rooms/join/status?playerId=${playerId}`
  );
  return response.requests;
};

export const fetchOwnerJoinRequests = async (roomId: string, ownerId: string) => {
  const response = await apiFetch<{ requests: RoomJoinRequest[] }>(
    `/api/rooms/${roomId}/join-requests?ownerId=${ownerId}`
  );
  return response.requests;
};

export const respondToJoinRequest = async (
  requestId: string,
  ownerId: string,
  decision: 'APPROVE' | 'DENY'
) => {
  return apiFetch<RoomJoinRequest>(`/api/rooms/join/requests/${requestId}`, {
    method: 'POST',
    body: JSON.stringify({ ownerId, decision }),
  });
};

export const cancelJoinRequest = async (requestId: string) => {
  return apiFetch<RoomJoinRequest>(`/api/rooms/join/requests/${requestId}`, {
    method: 'DELETE',
  });
};

export { supabase, currentUserId };
export type { SupabaseClient, RealtimeChannel };
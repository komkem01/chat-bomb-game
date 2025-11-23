import { Database } from './database';

export type DbRoom = Database['public']['Tables']['rooms']['Row'];
export type DbPlayer = Database['public']['Tables']['room_players']['Row'];
export type DbMessage = Database['public']['Tables']['messages']['Row'];

export interface Player {
  id: string;
  name: string;
  isEliminated?: boolean;
}

export interface Message {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
  isBoom: boolean;
}

export interface PodiumEntry {
  position: number;
  playerId: string;
  playerName: string;
  points: number;
  status: 'survivor' | 'eliminated';
  eliminatedAt?: string | null;
}

export interface RoomData {
  room: DbRoom;
  players: DbPlayer[];
  messages: DbMessage[];
  podium?: PodiumEntry[];
  pendingRequestsCount?: number;
}

export interface RelayRoomSummary {
  roomId: string;
  roomCode: string;
  status: DbRoom['status'];
  playerCount: number;
  hint: string | null;
  setterName: string | null;
}

export interface RelaySession {
  sessionId: string;
  originRoomId: string;
  targetRoomId: string;
  role: string;
}

export interface PublicRoomSummary {
  roomId: string;
  roomCode: string;
  status: DbRoom['status'];
  playerCount: number;
  maxPlayers: number;
  hint: string | null;
  setterName: string | null;
  ownerName: string | null;
  hasPendingRequest: boolean;
  isMember: boolean;
}

export interface RoomJoinRequest {
  id: string;
  roomId: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  createdAt: string;
  resolvedAt: string | null;
}

export type GameScreen = 'loading' | 'name' | 'modeSelect' | 'multiplayer' | 'game';

export type ToastType = 'info' | 'success' | 'error';

export interface GameState {
  userId: string | null;
  playerName: string | null;
  currentRoomId: string | null;
  currentRoomData: RoomData | null;
  currentScreen: GameScreen;
  sessionType: 'multiplayer' | 'solo';
}
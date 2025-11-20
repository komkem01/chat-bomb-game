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
  id: number;
  sender: string;
  senderId: string;
  text: string;
  timestamp: string;
  isBoom: boolean;
}

export interface RoomData {
  room: DbRoom;
  players: DbPlayer[];
  messages: DbMessage[];
}

export type GameScreen = 'loading' | 'name' | 'lobby' | 'game';

export type ToastType = 'info' | 'success' | 'error';

export interface GameState {
  userId: string | null;
  playerName: string | null;
  currentRoomId: string | null;
  currentRoomData: RoomData | null;
  currentScreen: GameScreen;
}
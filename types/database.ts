export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: number;
          room_id: string;
          owner_id: string;
          status: 'IDLE' | 'PLAYING' | 'CLOSED';
          bomb_word: string | null;
          hint: string | null;
          setter_id: string | null;
          setter_name: string | null;
          round_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          room_id: string;
          owner_id: string;
          status?: 'IDLE' | 'PLAYING' | 'CLOSED';
          bomb_word?: string | null;
          hint?: string | null;
          setter_id?: string | null;
          setter_name?: string | null;
          round_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          room_id?: string;
          owner_id?: string;
          status?: 'IDLE' | 'PLAYING' | 'CLOSED';
          bomb_word?: string | null;
          hint?: string | null;
          setter_id?: string | null;
          setter_name?: string | null;
          round_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      room_players: {
        Row: {
          id: number;
          room_id: string;
          player_id: string;
          player_name: string;
          is_eliminated: boolean;
          is_guest: boolean;
          origin_room_id: string | null;
          joined_at: string;
        };
        Insert: {
          id?: number;
          room_id: string;
          player_id: string;
          player_name: string;
          is_eliminated?: boolean;
          is_guest?: boolean;
          origin_room_id?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: number;
          room_id?: string;
          player_id?: string;
          player_name?: string;
          is_eliminated?: boolean;
          is_guest?: boolean;
          origin_room_id?: string | null;
          joined_at?: string;
        };
      };
      messages: {
        Row: {
          id: number;
          room_id: string;
          sender_id: string;
          sender_name: string;
          message_text: string;
          is_boom: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          room_id: string;
          sender_id: string;
          sender_name: string;
          message_text: string;
          is_boom?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          room_id?: string;
          sender_id?: string;
          sender_name?: string;
          message_text?: string;
          is_boom?: boolean;
          created_at?: string;
        };
      };
      relay_sessions: {
        Row: {
          id: number;
          session_id: string;
          player_id: string;
          origin_room_id: string;
          target_room_id: string;
          status: 'MATCHING' | 'JOINED' | 'RETURNING' | 'CLOSED';
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          player_id: string;
          origin_room_id: string;
          target_room_id: string;
          status?: 'MATCHING' | 'JOINED' | 'RETURNING' | 'CLOSED';
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          player_id?: string;
          origin_room_id?: string;
          target_room_id?: string;
          status?: 'MATCHING' | 'JOINED' | 'RETURNING' | 'CLOSED';
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      room_join_requests: {
        Row: {
          id: number;
          room_id: string;
          player_id: string;
          player_name: string;
          status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: number;
          room_id: string;
          player_id: string;
          player_name: string;
          status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: number;
          room_id?: string;
          player_id?: string;
          player_name?: string;
          status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
          created_at?: string;
          resolved_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
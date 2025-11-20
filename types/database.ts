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
          joined_at: string;
        };
        Insert: {
          id?: number;
          room_id: string;
          player_id: string;
          player_name: string;
          is_eliminated?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: number;
          room_id?: string;
          player_id?: string;
          player_name?: string;
          is_eliminated?: boolean;
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
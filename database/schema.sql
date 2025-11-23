-- Chat Bomb Game Database Schema for Supabase PostgreSQL

-- Disable Row Level Security so tables can be recreated safely
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS relay_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms DISABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist (order matters because of FK constraints)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS relay_sessions;
DROP TABLE IF EXISTS room_join_requests;
DROP TABLE IF EXISTS room_players;
DROP TABLE IF EXISTS rooms;

-- Ensure pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create rooms table
CREATE TABLE rooms (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code CHAR(6) UNIQUE NOT NULL,
    owner_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'PLAYING', 'CLOSED')),
    bomb_word VARCHAR(255),
    hint TEXT,
    setter_id UUID,
    setter_name VARCHAR(255),
    round_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    is_eliminated BOOLEAN DEFAULT FALSE,
    is_guest BOOLEAN DEFAULT FALSE,
    origin_room_id UUID REFERENCES rooms(room_id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

CREATE TABLE relay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    origin_room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    target_room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'JOINED' CHECK (status IN ('MATCHING', 'JOINED', 'RETURNING', 'CLOSED')),
    role VARCHAR(20) NOT NULL DEFAULT 'guest',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE room_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    is_boom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_room_players_player_id ON room_players(player_id);
CREATE INDEX idx_relay_sessions_origin_room_id ON relay_sessions(origin_room_id);
CREATE INDEX idx_relay_sessions_target_room_id ON relay_sessions(target_room_id);
CREATE INDEX idx_relay_sessions_status ON relay_sessions(status);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_room_join_requests_room_id ON room_join_requests(room_id);
CREATE INDEX idx_room_join_requests_player_id ON room_join_requests(player_id);
CREATE UNIQUE INDEX idx_room_join_requests_pending_per_player
    ON room_join_requests(player_id)
    WHERE status = 'PENDING';

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE relay_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE room_join_requests;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relay_sessions_updated_at
    BEFORE UPDATE ON relay_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_join_requests_updated_at
    BEFORE UPDATE ON room_join_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Enable Row Level Security (RLS) policies
-- Uncomment these if you want to add security policies later

-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE relay_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE room_join_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example public policies (adjust as needed)
-- CREATE POLICY "Allow public read access on rooms" ON rooms FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access on rooms" ON rooms FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update access on rooms" ON rooms FOR UPDATE USING (true);
-- CREATE POLICY "Allow public access on room_players" ON room_players FOR ALL USING (true);
-- CREATE POLICY "Allow public access on messages" ON messages FOR ALL USING (true);
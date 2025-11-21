import { query } from './db';
import { HttpError, badRequest, forbidden, notFound } from './errors';
import { DbMessage, DbPlayer, DbRoom, RoomData, PodiumEntry } from '@/types/game';

const MAX_ROOM_CODE_ATTEMPTS = 7;
const MAX_MESSAGE_HISTORY = 200;
const PODIUM_POINTS = [5, 3, 1];
const ROUND_DURATION_MS = 10 * 60 * 1000;

const normalize = (text: string) => text.trim().toLowerCase();

const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createRoomService = async (
  ownerId: string,
  ownerName: string,
  preferredRoomId?: string
): Promise<RoomData> => {
  const attemptedCodes = new Set<string>();
  let attempts = 0;

  while (attempts < MAX_ROOM_CODE_ATTEMPTS) {
    const roomCode = attempts === 0 && preferredRoomId ? preferredRoomId : generateUniqueCode(attemptedCodes);
    attemptedCodes.add(roomCode);
    try {
      const roomResult = await query<DbRoom>(
        `INSERT INTO rooms (room_id, owner_id, status)
         VALUES ($1, $2, 'IDLE')
         RETURNING *`,
        [roomCode, ownerId]
      );

      await query(
        `INSERT INTO room_players (room_id, player_id, player_name, is_eliminated)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (room_id, player_id) DO UPDATE SET player_name = EXCLUDED.player_name`,
        [roomCode, ownerId, ownerName]
      );

      return getRoomDataService(roomCode);
    } catch (error: any) {
      if (error.code === '23505') {
        attempts += 1;
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(500, 'ไม่สามารถสร้างห้องใหม่ได้ โปรดลองอีกครั้ง');
};

const generateUniqueCode = (used: Set<string>) => {
  let code = generateRoomCode();
  while (used.has(code)) {
    code = generateRoomCode();
  }
  return code;
};

export const joinRoomService = async (roomId: string, playerId: string, playerName: string): Promise<RoomData> => {
  const room = await getRoomByCode(roomId);

  if (room.status === 'CLOSED') {
    throw forbidden('ห้องนี้ถูกปิดแล้ว');
  }

  const existingPlayer = await query<DbPlayer>(
    `SELECT * FROM room_players WHERE room_id = $1 AND player_id = $2`,
    [roomId, playerId]
  );

  const playerRow = existingPlayer.rows[0];
  if (playerRow?.is_eliminated) {
    throw forbidden('คุณถูกคัดออกแล้ว กรุณารอรอบถัดไป');
  }

  await query(
    `INSERT INTO room_players (room_id, player_id, player_name, is_eliminated)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (room_id, player_id)
     DO UPDATE SET player_name = EXCLUDED.player_name`,
    [roomId, playerId, playerName]
  );

  return getRoomDataService(roomId);
};

export const getRoomDataService = async (roomId: string): Promise<RoomData> => {
  try {
    let room = await getRoomByCode(roomId);
    room = await enforceRoundTimer(room);

    const [playersResult, messagesResult] = await Promise.all([
      query<DbPlayer>(
        `SELECT * FROM room_players
         WHERE room_id = $1
         ORDER BY joined_at ASC`,
        [roomId]
      ),
      query<DbMessage>(
        `SELECT *
           FROM (
             SELECT *
               FROM messages
              WHERE room_id = $1
              ORDER BY created_at DESC
              LIMIT $2
           ) recent_messages
          ORDER BY created_at ASC`,
        [roomId, MAX_MESSAGE_HISTORY]
      ),
    ]);

    const podium = room.status === 'CLOSED' ? await getPodiumForRoom(roomId, playersResult.rows) : undefined;

    return {
      room,
      players: playersResult.rows,
      messages: messagesResult.rows,
      podium,
    };
  } catch (error) {
    console.error(`Error getting room data for ${roomId}:`, error);
    throw error;
  }
};

export const updateRoomSettingsService = async (
  roomId: string,
  setterId: string,
  setterName: string,
  bombWord: string,
  hint: string
): Promise<RoomData> => {
  if (!bombWord) {
    throw badRequest('กรุณาระบุคำกับดัก');
  }

  const room = await getRoomByCode(roomId);
  if (room.owner_id !== setterId) {
    throw forbidden('เฉพาะเจ้าของห้องเท่านั้นที่ตั้งค่าได้');
  }

  await query(
    `UPDATE rooms
     SET bomb_word = $2,
         hint = $3,
         setter_id = $4,
         setter_name = $5,
         status = 'PLAYING',
         round_started_at = NOW(),
         updated_at = NOW()
     WHERE room_id = $1`,
    [roomId, normalize(bombWord), hint || null, setterId, setterName]
  );

  return getRoomDataService(roomId);
};

export const sendMessageService = async (
  roomId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<RoomData> => {
  if (!text.trim()) {
    throw badRequest('ข้อความว่างเปล่า');
  }

  const room = await getRoomByCode(roomId);
  if (room.status !== 'PLAYING') {
    throw badRequest('ยังไม่ได้เริ่มรอบ');
  }

  const playerResult = await query<DbPlayer>(
    `SELECT * FROM room_players WHERE room_id = $1 AND player_id = $2`,
    [roomId, senderId]
  );
  const player = playerResult.rows[0];
  if (!player) {
    throw forbidden('คุณไม่ได้อยู่ในห้องนี้');
  }
  if (player.is_eliminated) {
    throw forbidden('คุณถูกตัดออกแล้ว');
  }

  const normalizedText = normalize(text);
  const isBoom = !!room.bomb_word && normalizedText === room.bomb_word;
  
  // Eliminate the sender if they repeat another player's exact message (case-insensitive)
  const duplicateResult = await query<{ sender_id: string }>(
    `SELECT sender_id
       FROM messages
      WHERE room_id = $1
        AND LOWER(TRIM(message_text)) = $2
      LIMIT 1`,
    [roomId, normalizedText]
  );
  const isDuplicate = duplicateResult.rows.length > 0;
  const shouldEliminate = isBoom || isDuplicate;

  await query(
    `INSERT INTO messages (room_id, sender_id, sender_name, message_text, is_boom)
     VALUES ($1, $2, $3, $4, $5)`
    , [roomId, senderId, senderName, text, shouldEliminate]
  );

  if (shouldEliminate) {
    await query(
      `UPDATE room_players SET is_eliminated = TRUE WHERE room_id = $1 AND player_id = $2`,
      [roomId, senderId]
    );
  }

  return getRoomDataService(roomId);
};

export const closeRoomService = async (roomId: string, ownerId: string): Promise<RoomData> => {
  const room = await getRoomByCode(roomId);
  if (room.owner_id !== ownerId) {
    throw forbidden('เฉพาะเจ้าของห้องเท่านั้นที่ปิดห้องได้');
  }

  await query(
    `UPDATE rooms
        SET status = 'CLOSED',
            round_started_at = NULL,
            updated_at = NOW()
      WHERE room_id = $1`,
    [roomId]
  );
  return getRoomDataService(roomId);
};

export const resetRoomService = async (roomId: string, ownerId: string): Promise<RoomData> => {
  const room = await getRoomByCode(roomId);
  if (room.owner_id !== ownerId) {
    throw forbidden('เฉพาะเจ้าของห้องเท่านั้นที่รีเซ็ตได้');
  }

  await query(
    `UPDATE rooms
     SET status = 'IDLE',
         bomb_word = NULL,
         hint = NULL,
         setter_id = NULL,
         setter_name = NULL,
         round_started_at = NULL,
         updated_at = NOW()
     WHERE room_id = $1`,
    [roomId]
  );
  await query(`DELETE FROM messages WHERE room_id = $1`, [roomId]);
  await query(`UPDATE room_players SET is_eliminated = FALSE WHERE room_id = $1`, [roomId]);

  return getRoomDataService(roomId);
};

export const cleanupClosedRoomsService = async (gracePeriodDays = 1) => {
  const numericDays = Number.isFinite(gracePeriodDays) ? Math.floor(Number(gracePeriodDays)) : NaN;

  if (!Number.isFinite(numericDays) || numericDays < 0) {
    throw badRequest('ระยะเวลาต้องเป็นจำนวนวันที่มากกว่าหรือเท่ากับ 0');
  }

  const result = await query<{ rooms_deleted: string | number }>(
    `WITH deleted AS (
       DELETE FROM rooms
        WHERE status = 'CLOSED'
          AND updated_at <= NOW() - ($1 * INTERVAL '1 day')
        RETURNING room_id
     )
     SELECT COUNT(*)::int AS rooms_deleted FROM deleted`,
    [numericDays]
  );

  const roomsDeleted = Number(result.rows[0]?.rooms_deleted ?? 0);

  return {
    roomsDeleted,
    daysThreshold: numericDays,
    deletedAt: new Date().toISOString(),
  };
};

const enforceRoundTimer = async (room: DbRoom): Promise<DbRoom> => {
  if (room.status !== 'PLAYING' || !room.round_started_at) {
    return room;
  }

  const roundStartTime = new Date(room.round_started_at).getTime();
  if (!Number.isFinite(roundStartTime)) {
    return room;
  }

  const hasExpired = Date.now() >= roundStartTime + ROUND_DURATION_MS;
  if (!hasExpired) {
    return room;
  }

  const updatedRoomResult = await query<DbRoom>(
    `UPDATE rooms
        SET status = 'CLOSED',
            round_started_at = NULL,
            updated_at = NOW()
      WHERE room_id = $1
        AND status = 'PLAYING'
      RETURNING *`,
    [room.room_id]
  );

  const updatedRoom = updatedRoomResult.rows[0];
  if (!updatedRoom) {
    return room;
  }

  const eliminationCountResult = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM room_players
      WHERE room_id = $1
        AND is_eliminated = TRUE`,
    [room.room_id]
  );

  const eliminationCount = eliminationCountResult.rows[0]?.count ?? 0;

  if (eliminationCount === 0) {
    await query(
      `INSERT INTO messages (room_id, sender_id, sender_name, message_text, is_boom)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [room.room_id, 'system_timer', 'ระบบจับเวลา', 'ทุกคนเก่งมากที่ยังอยู่รอด']
    );
  }

  return updatedRoom;
};

const getRoomByCode = async (roomId: string): Promise<DbRoom> => {
  const result = await query<DbRoom>(`SELECT * FROM rooms WHERE room_id = $1`, [roomId]);
  const room = result.rows[0];
  if (!room) {
    throw notFound('ไม่พบห้องที่ระบุ');
  }
  return room;
};

const getPodiumForRoom = async (roomId: string, players: DbPlayer[]): Promise<PodiumEntry[]> => {
  if (!players.length) {
    return [];
  }

  const eliminationsResult = await query<{ sender_id: string; eliminated_at: Date }>(
    `SELECT sender_id, MAX(created_at) AS eliminated_at
       FROM messages
      WHERE room_id = $1
        AND is_boom = TRUE
      GROUP BY sender_id`,
    [roomId]
  );

  const eliminationMap = new Map<string, Date>();
  eliminationsResult.rows.forEach((row) => {
    eliminationMap.set(row.sender_id, new Date(row.eliminated_at));
  });

  const ranking = players
    .map((player) => {
      const eliminationDate = eliminationMap.get(player.player_id);
      const survivalValue = eliminationDate ? eliminationDate.getTime() : Number.MAX_SAFE_INTEGER;
      return {
        playerId: player.player_id,
        playerName: player.player_name,
        isEliminated: player.is_eliminated,
        eliminationDate,
        joinTime: new Date(player.joined_at).getTime(),
        survivalValue,
      };
    })
    .sort((a, b) => {
      if (a.survivalValue === b.survivalValue) {
        return a.joinTime - b.joinTime;
      }
      return b.survivalValue - a.survivalValue;
    });

  return ranking.slice(0, 3).map((entry, index) => ({
    position: index + 1,
    playerId: entry.playerId,
    playerName: entry.playerName,
    points: PODIUM_POINTS[index] ?? 0,
    status: entry.isEliminated ? 'eliminated' : 'survivor',
    eliminatedAt: entry.eliminationDate ? entry.eliminationDate.toISOString() : null,
  }));
};

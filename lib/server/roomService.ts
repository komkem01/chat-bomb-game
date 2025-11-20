import { query } from './db';
import { HttpError, badRequest, forbidden, notFound } from './errors';
import { DbMessage, DbPlayer, DbRoom, RoomData } from '@/types/game';

const MAX_ROOM_CODE_ATTEMPTS = 7;

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

  await query(
    `INSERT INTO room_players (room_id, player_id, player_name, is_eliminated)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (room_id, player_id)
     DO UPDATE SET player_name = EXCLUDED.player_name, is_eliminated = FALSE`,
    [roomId, playerId, playerName]
  );

  return getRoomDataService(roomId);
};

export const getRoomDataService = async (roomId: string): Promise<RoomData> => {
  const room = await getRoomByCode(roomId);

  const [playersResult, messagesResult] = await Promise.all([
    query<DbPlayer>(
      `SELECT * FROM room_players
       WHERE room_id = $1
       ORDER BY joined_at ASC`,
      [roomId]
    ),
    query<DbMessage>(
      `SELECT * FROM messages
       WHERE room_id = $1
       ORDER BY created_at ASC`,
      [roomId]
    ),
  ]);

  return {
    room,
    players: playersResult.rows,
    messages: messagesResult.rows,
  };
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
         updated_at = NOW()
     WHERE room_id = $1`,
    [roomId, normalize(bombWord), hint || null, setterId, setterName]
  );

  await query(`DELETE FROM messages WHERE room_id = $1`, [roomId]);
  await query(`UPDATE room_players SET is_eliminated = FALSE WHERE room_id = $1`, [roomId]);

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
  const isBoom = !!room.bomb_word && normalizedText.includes(room.bomb_word);
  // Eliminate the sender if they repeat another player's exact message
  const duplicateResult = await query<{ sender_id: string }>(
    `SELECT sender_id
       FROM messages
      WHERE room_id = $1
        AND sender_id <> $2
        AND LOWER(TRIM(message_text)) = $3
      LIMIT 1`,
    [roomId, senderId, normalizedText]
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

  await query(`UPDATE rooms SET status = 'CLOSED', updated_at = NOW() WHERE room_id = $1`, [roomId]);
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
         updated_at = NOW()
     WHERE room_id = $1`,
    [roomId]
  );
  await query(`DELETE FROM messages WHERE room_id = $1`, [roomId]);
  await query(`UPDATE room_players SET is_eliminated = FALSE WHERE room_id = $1`, [roomId]);

  return getRoomDataService(roomId);
};

const getRoomByCode = async (roomId: string): Promise<DbRoom> => {
  const result = await query<DbRoom>(`SELECT * FROM rooms WHERE room_id = $1`, [roomId]);
  const room = result.rows[0];
  if (!room) {
    throw notFound('ไม่พบห้องที่ระบุ');
  }
  return room;
};

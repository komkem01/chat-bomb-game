import { query, withTransaction } from './db';
import { HttpError, badRequest, forbidden, notFound, conflict } from './errors';
import {
  DbMessage,
  DbPlayer,
  DbRoom,
  RoomData,
  PodiumEntry,
  RelayRoomSummary,
  RelaySession,
  PublicRoomSummary,
  RoomJoinRequest,
} from '@/types/game';
import {
  MAX_PLAYERS_PER_ROOM,
  MAX_RELAY_ROOM_RESULTS,
  RELAY_SESSION_PREFIX,
  JOIN_REQUEST_TIMEOUT_SECONDS,
} from '@/lib/constants';

const MAX_ROOM_CODE_ATTEMPTS = 7;
const MAX_MESSAGE_HISTORY = 200;
const PODIUM_POINTS = [5, 3, 1];
const ROUND_DURATION_MS = 10 * 60 * 1000;

const expirePendingRequestsForPlayer = async (playerId: string) => {
  await query(
    `UPDATE room_join_requests
        SET status = 'EXPIRED',
            resolved_at = NOW()
      WHERE player_id = $1
        AND status = 'PENDING'
        AND created_at <= NOW() - ($2 * INTERVAL '1 second')`,
    [playerId, JOIN_REQUEST_TIMEOUT_SECONDS]
  );
};

const expirePendingRequestsForRoom = async (roomId: string) => {
  await query(
    `UPDATE room_join_requests
        SET status = 'EXPIRED',
            resolved_at = NOW()
      WHERE room_id = $1
        AND status = 'PENDING'
        AND created_at <= NOW() - ($2 * INTERVAL '1 second')`,
    [roomId, JOIN_REQUEST_TIMEOUT_SECONDS]
  );
};

const normalize = (text: string) => text.trim().toLowerCase();

const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const mapJoinRequestRow = (row: any): RoomJoinRequest => ({
  id: row.id,
  roomId: row.room_id,
  playerId: row.player_id,
  playerName: row.player_name,
  status: row.status,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
});

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

  if (!playerRow) {
    const playerCountResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM room_players WHERE room_id = $1`,
      [roomId]
    );
    const playerCount = playerCountResult.rows[0]?.count ?? 0;
    if (playerCount >= MAX_PLAYERS_PER_ROOM) {
      throw forbidden(`ห้องนี้เต็มแล้ว (สูงสุด ${MAX_PLAYERS_PER_ROOM} คน)`);
    }
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

    const pendingRequestsResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM room_join_requests
        WHERE room_id = $1 AND status = 'PENDING'`,
      [roomId]
    );

    return {
      room,
      players: playersResult.rows,
      messages: messagesResult.rows,
      podium,
      pendingRequestsCount: pendingRequestsResult.rows[0]?.count ?? 0,
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

export const listActiveRoomsService = async (playerId?: string): Promise<PublicRoomSummary[]> => {
  if (playerId) {
    await expirePendingRequestsForPlayer(playerId);
  }

  const result = await query<{
    room_id: string;
    status: DbRoom['status'];
    player_count: number;
    hint: string | null;
    setter_name: string | null;
    owner_name: string | null;
    has_pending_request: boolean;
    is_member: boolean;
  }>(
    `SELECT
        r.room_id,
        r.status,
        COALESCE(pc.player_count, 0) AS player_count,
        r.hint,
        r.setter_name,
        owner.player_name AS owner_name,
        CASE
          WHEN $1::text IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
              FROM room_join_requests rjr
             WHERE rjr.room_id = r.room_id
               AND rjr.player_id = $1
               AND rjr.status = 'PENDING'
               AND rjr.created_at > NOW() - ($2 * INTERVAL '1 second')
          )
        END AS has_pending_request,
        CASE
          WHEN $1::text IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
              FROM room_players rp
             WHERE rp.room_id = r.room_id
               AND rp.player_id = $1
          )
        END AS is_member
      FROM rooms r
      LEFT JOIN (
        SELECT room_id, COUNT(*)::int AS player_count
          FROM room_players
         GROUP BY room_id
      ) pc ON pc.room_id = r.room_id
      LEFT JOIN room_players owner ON owner.room_id = r.room_id AND owner.player_id = r.owner_id
      WHERE r.status IN ('IDLE', 'PLAYING')
      ORDER BY (r.status = 'PLAYING') DESC, pc.player_count DESC, r.room_id ASC`,
    [playerId ?? null, JOIN_REQUEST_TIMEOUT_SECONDS]
  );

  return result.rows.map((row) => ({
    roomId: row.room_id,
    status: row.status,
    playerCount: row.player_count,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    hint: row.hint,
    setterName: row.setter_name,
    ownerName: row.owner_name,
    hasPendingRequest: row.has_pending_request,
    isMember: row.is_member,
  }));
};

export const requestRoomAccessService = async (
  roomId: string,
  playerId: string,
  playerName: string
): Promise<RoomJoinRequest> => {
  const room = await getRoomByCode(roomId);

  if (room.status === 'CLOSED') {
    throw forbidden('ห้องนี้ปิดไปแล้ว');
  }

  if (room.owner_id === playerId) {
    throw conflict('คุณเป็นเจ้าของห้องนี้อยู่แล้ว');
  }

  const memberResult = await query<DbPlayer>(
    `SELECT * FROM room_players WHERE room_id = $1 AND player_id = $2`,
    [roomId, playerId]
  );
  if (memberResult.rows.length > 0) {
    throw conflict('คุณอยู่ในห้องนี้แล้ว');
  }

  await expirePendingRequestsForPlayer(playerId);

  const pendingResult = await query<{ room_id: string }>(
    `SELECT room_id
       FROM room_join_requests
      WHERE player_id = $1
        AND status = 'PENDING'
      LIMIT 1`,
    [playerId]
  );

  if (pendingResult.rows.length > 0) {
    const existingRoomId = pendingResult.rows[0].room_id;
    if (existingRoomId === roomId) {
      throw conflict('คุณได้ส่งคำขอไปยังห้องนี้แล้ว โปรดรอการอนุมัติ');
    }
    throw conflict('คุณมีคำขอรออนุมัติอยู่แล้ว โปรดรอ 1 นาทีหรือจนกว่าจะมีคำตอบ');
  }

  const insertResult = await query(
    `INSERT INTO room_join_requests (room_id, player_id, player_name, status, created_at, resolved_at)
     VALUES ($1, $2, $3, 'PENDING', NOW(), NULL)
     ON CONFLICT (room_id, player_id)
     DO UPDATE SET status = 'PENDING', player_name = EXCLUDED.player_name, created_at = NOW(), resolved_at = NULL
     RETURNING *`,
    [roomId, playerId, playerName]
  );

  return mapJoinRequestRow(insertResult.rows[0]);
};

export const getPlayerJoinRequestsService = async (playerId: string): Promise<RoomJoinRequest[]> => {
  await expirePendingRequestsForPlayer(playerId);

  const result = await query(
    `SELECT *
       FROM room_join_requests
      WHERE player_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [playerId]
  );
  return result.rows.map(mapJoinRequestRow);
};

export const getOwnerJoinRequestsService = async (
  roomId: string,
  ownerId: string
): Promise<RoomJoinRequest[]> => {
  const room = await getRoomByCode(roomId);
  if (room.owner_id !== ownerId) {
    throw forbidden('เฉพาะเจ้าของห้องเท่านั้นที่ดูคำขอได้');
  }

  await expirePendingRequestsForRoom(roomId);

  const result = await query(
    `SELECT *
       FROM room_join_requests
      WHERE room_id = $1 AND status = 'PENDING'
        AND created_at > NOW() - ($2 * INTERVAL '1 second')
      ORDER BY created_at ASC`,
    [roomId, JOIN_REQUEST_TIMEOUT_SECONDS]
  );

  return result.rows.map(mapJoinRequestRow);
};

export const respondJoinRequestService = async (
  requestId: number,
  ownerId: string,
  decision: 'APPROVE' | 'DENY'
): Promise<RoomJoinRequest> => {
  const requestResult = await query(
    `SELECT rjr.*, rooms.owner_id
       FROM room_join_requests rjr
       JOIN rooms ON rooms.room_id = rjr.room_id
      WHERE rjr.id = $1`,
    [requestId]
  );

  const request = requestResult.rows[0];
  if (!request) {
    throw notFound('ไม่พบคำขอเข้าร่วม');
  }
  if (request.owner_id !== ownerId) {
    throw forbidden('คุณไม่มีสิทธิ์จัดการคำขอนี้');
  }
  if (request.status !== 'PENDING') {
    throw conflict('คำขอนี้ถูกจัดการไปแล้ว');
  }

  if (decision === 'APPROVE') {
    await joinRoomService(request.room_id, request.player_id, request.player_name);
  }

  const updatedResult = await query(
    `UPDATE room_join_requests
        SET status = $2,
            resolved_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [requestId, decision === 'APPROVE' ? 'APPROVED' : 'DENIED']
  );

  return mapJoinRequestRow(updatedResult.rows[0]);
};

interface CreateRelaySessionParams {
  originRoomId: string;
  targetRoomId: string;
  playerId: string;
  playerName: string;
  role?: string;
}

const generateRelaySessionId = () =>
  `${RELAY_SESSION_PREFIX}${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-6)}`;

const assertPlayerInRoom = async (roomId: string, playerId: string) => {
  const result = await query<DbPlayer>(
    `SELECT * FROM room_players WHERE room_id = $1 AND player_id = $2`,
    [roomId, playerId]
  );
  const player = result.rows[0];
  if (!player) {
    throw forbidden('คุณไม่ได้อยู่ในห้องนี้');
  }
  return player;
};

const assertNoActiveRelaySession = async (playerId: string) => {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM relay_sessions
      WHERE player_id = $1
        AND status IN ('MATCHING', 'JOINED', 'RETURNING')`,
    [playerId]
  );

  if ((result.rows[0]?.count ?? 0) > 0) {
    throw conflict('คุณอยู่ระหว่างการเชื่อมต่อกับห้องอื่นอยู่แล้ว');
  }
};

const ensureRoomHasCapacity = async (roomId: string) => {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM room_players WHERE room_id = $1`,
    [roomId]
  );
  if ((result.rows[0]?.count ?? 0) >= MAX_PLAYERS_PER_ROOM) {
    throw forbidden('ห้องนี้เต็มแล้ว');
  }
};

const createRelaySession = async ({
  originRoomId,
  targetRoomId,
  playerId,
  playerName,
  role = 'guest',
}: CreateRelaySessionParams): Promise<RelayJoinResult> => {
  const sessionId = generateRelaySessionId();

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO relay_sessions (session_id, player_id, origin_room_id, target_room_id, status, role)
       VALUES ($1, $2, $3, $4, 'JOINED', $5)`,
      [sessionId, playerId, originRoomId, targetRoomId, role]
    );

    await client.query(
      `INSERT INTO room_players (room_id, player_id, player_name, is_eliminated, is_guest, origin_room_id)
       VALUES ($1, $2, $3, FALSE, TRUE, $4)
       ON CONFLICT (room_id, player_id)
       DO UPDATE SET player_name = EXCLUDED.player_name,
                     is_eliminated = FALSE,
                     is_guest = TRUE,
                     origin_room_id = EXCLUDED.origin_room_id,
                     joined_at = NOW()`,
      [targetRoomId, playerId, playerName, originRoomId]
    );
  });

  return {
    session: {
      sessionId,
      originRoomId,
      targetRoomId,
      role,
    },
    roomData: await getRoomDataService(targetRoomId),
  };
};

export interface RelayJoinResult {
  session: RelaySession;
  roomData: RoomData;
}

export const getAvailableRelayRoomsService = async (
  playerId: string,
  originRoomId: string
): Promise<RelayRoomSummary[]> => {
  await assertPlayerInRoom(originRoomId, playerId);

  const result = await query<{
    room_id: string;
    status: DbRoom['status'];
    player_count: number;
    hint: string | null;
    setter_name: string | null;
  }>(
    `SELECT r.room_id,
            r.status,
            r.hint,
            r.setter_name,
            COUNT(rp.player_id)::int AS player_count
       FROM rooms r
  LEFT JOIN room_players rp ON rp.room_id = r.room_id
      WHERE r.room_id <> $1
        AND r.status <> 'CLOSED'
      GROUP BY r.room_id
     HAVING COUNT(rp.player_id) < $2
      ORDER BY (r.status = 'PLAYING') DESC, r.updated_at DESC
      LIMIT $3`,
    [originRoomId, MAX_PLAYERS_PER_ROOM, MAX_RELAY_ROOM_RESULTS]
  );

  return result.rows.map((row) => ({
    roomId: row.room_id,
    status: row.status,
    playerCount: row.player_count,
    hint: row.hint,
    setterName: row.setter_name,
  }));
};

export const matchRelayRoomService = async (
  playerId: string,
  playerName: string,
  originRoomId: string
): Promise<RelayJoinResult> => {
  await assertPlayerInRoom(originRoomId, playerId);
  await assertNoActiveRelaySession(playerId);

  const targetResult = await query<{ room_id: string }>(
    `SELECT r.room_id
       FROM rooms r
  LEFT JOIN room_players rp ON rp.room_id = r.room_id
      WHERE r.room_id <> $1
        AND r.status <> 'CLOSED'
      GROUP BY r.room_id
     HAVING COUNT(rp.player_id) < $2
   ORDER BY RANDOM()
      LIMIT 1`,
    [originRoomId, MAX_PLAYERS_PER_ROOM]
  );

  const target = targetResult.rows[0];
  if (!target) {
    throw badRequest('ยังไม่มีห้องที่เปิดรับผู้เล่นเพิ่มในตอนนี้');
  }

  return createRelaySession({
    originRoomId,
    targetRoomId: target.room_id,
    playerId,
    playerName,
  });
};

export const joinRelayRoomService = async (
  playerId: string,
  playerName: string,
  originRoomId: string,
  targetRoomId: string
): Promise<RelayJoinResult> => {
  if (originRoomId === targetRoomId) {
    throw badRequest('ไม่สามารถเข้าห้องเดิมได้');
  }

  await assertPlayerInRoom(originRoomId, playerId);
  await assertNoActiveRelaySession(playerId);
  await ensureRoomHasCapacity(targetRoomId);

  return createRelaySession({
    originRoomId,
    targetRoomId,
    playerId,
    playerName,
  });
};

export const returnRelaySessionService = async (
  sessionId: string,
  playerId: string
) => {
  const sessionResult = await query<{
    origin_room_id: string;
    target_room_id: string;
    status: string;
  }>(
    `SELECT origin_room_id, target_room_id, status
       FROM relay_sessions
      WHERE session_id = $1
        AND player_id = $2`,
    [sessionId, playerId]
  );

  const session = sessionResult.rows[0];
  if (!session) {
    throw notFound('ไม่พบเซสชันเชื่อมห้องนี้');
  }

  if (session.status === 'CLOSED') {
    return {
      originRoomId: session.origin_room_id,
      roomData: await getRoomDataService(session.origin_room_id),
    };
  }

  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM room_players
        WHERE room_id = $1
          AND player_id = $2
          AND is_guest = TRUE`,
      [session.target_room_id, playerId]
    );

    await client.query(
      `UPDATE relay_sessions
          SET status = 'CLOSED',
              updated_at = NOW()
        WHERE session_id = $1`,
      [sessionId]
    );
  });

  return {
    originRoomId: session.origin_room_id,
    roomData: await getRoomDataService(session.origin_room_id),
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

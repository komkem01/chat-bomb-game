import { NextRequest } from 'next/server';
import { joinRelayRoomService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { playerId, playerName, originRoomId, targetRoomId } = await request.json();

    if (!playerId || !playerName || !originRoomId || !targetRoomId) {
      throw badRequest('ข้อมูลไม่ครบถ้วนสำหรับการเชื่อมต่อห้อง');
    }

    const payload = await joinRelayRoomService(playerId, playerName, originRoomId, targetRoomId);
    return jsonResponse(payload);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

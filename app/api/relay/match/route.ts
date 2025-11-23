import { NextRequest } from 'next/server';
import { matchRelayRoomService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { playerId, playerName, originRoomId } = await request.json();

    if (!playerId || !playerName || !originRoomId) {
      throw badRequest('playerId, playerName และ originRoomId ต้องถูกระบุ');
    }

    const payload = await matchRelayRoomService(playerId, playerName, originRoomId);
    return jsonResponse(payload);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

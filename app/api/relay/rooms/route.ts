import { NextRequest } from 'next/server';
import { getAvailableRelayRoomsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const originRoomId = searchParams.get('originRoomId');

    if (!playerId || !originRoomId) {
      throw badRequest('playerId และ originRoomId ต้องถูกระบุ');
    }

    const rooms = await getAvailableRelayRoomsService(playerId, originRoomId);
    return jsonResponse({ rooms });
  } catch (error) {
    return handleErrorResponse(error);
  }
}

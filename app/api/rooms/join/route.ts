import { NextRequest } from 'next/server';
import { joinRoomService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId, playerName } = await request.json();

    if (!roomId || !playerId || !playerName) {
      throw badRequest('roomId, playerId และ playerName ต้องถูกระบุ');
    }

    const roomData = await joinRoomService(roomId, playerId, playerName);
    return jsonResponse(roomData);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

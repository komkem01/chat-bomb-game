import { NextRequest } from 'next/server';
import { requestRoomAccessService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId, playerName } = await request.json();

    if (!roomId || !playerId || !playerName) {
      throw badRequest('roomId, playerId และ playerName จำเป็นต้องระบุ');
    }

    const joinRequest = await requestRoomAccessService(roomId, playerId, playerName);
    return jsonResponse(joinRequest, 201);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

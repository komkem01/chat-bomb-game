import { NextRequest } from 'next/server';
import { createRoomService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
  const { ownerId, ownerName, roomId } = await request.json();

    if (!ownerId || !ownerName) {
      throw badRequest('ownerId และ ownerName ต้องถูกระบุ');
    }

  const roomData = await createRoomService(ownerId, ownerName, roomId);
    return jsonResponse(roomData, 201);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

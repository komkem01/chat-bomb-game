import { NextRequest } from 'next/server';
import { closeRoomService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

interface Params {
  params: {
    roomId: string;
  };
}

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const { ownerId } = await request.json();

    if (!ownerId) {
      throw badRequest('ownerId ต้องถูกระบุ');
    }

    const roomData = await closeRoomService(context.params.roomId, ownerId);
    return jsonResponse(roomData);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

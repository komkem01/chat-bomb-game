import { NextRequest } from 'next/server';
import { getRoomDataService } from '@/lib/server/roomService';
import { handleErrorResponse, jsonResponse } from '@/lib/server/httpHelpers';

interface Params {
  params: {
    roomId: string;
  };
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const roomData = await getRoomDataService(context.params.roomId);
    return jsonResponse(roomData);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

import { NextRequest } from 'next/server';
import { listActiveRoomsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId') || undefined;
    const rooms = await listActiveRoomsService(playerId);
    return jsonResponse({ rooms });
  } catch (error) {
    return handleErrorResponse(error);
  }
}

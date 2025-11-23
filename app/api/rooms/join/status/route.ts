import { NextRequest } from 'next/server';
import { getPlayerJoinRequestsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      throw badRequest('playerId จำเป็นต้องระบุ');
    }

    const requests = await getPlayerJoinRequestsService(playerId);
    return jsonResponse({ requests });
  } catch (error) {
    return handleErrorResponse(error);
  }
}

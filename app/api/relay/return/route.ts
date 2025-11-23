import { NextRequest } from 'next/server';
import { returnRelaySessionService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerId } = await request.json();

    if (!sessionId || !playerId) {
      throw badRequest('sessionId และ playerId ต้องถูกระบุ');
    }

    const payload = await returnRelaySessionService(sessionId, playerId);
    return jsonResponse(payload);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

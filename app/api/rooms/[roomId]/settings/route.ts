import { NextRequest } from 'next/server';
import { updateRoomSettingsService } from '@/lib/server/roomService';
import { handleErrorResponse, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

interface Params {
  params: {
    roomId: string;
  };
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const { setterId, setterName, bombWord, hint } = await request.json();

    if (!setterId || !setterName || !bombWord) {
      throw badRequest('setterId, setterName และ bombWord ต้องถูกระบุ');
    }

    const roomData = await updateRoomSettingsService(
      context.params.roomId,
      setterId,
      setterName,
      bombWord,
      hint || ''
    );
    return jsonResponse(roomData);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

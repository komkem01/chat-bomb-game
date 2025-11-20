import { NextRequest } from 'next/server';
import { sendMessageService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, senderId, senderName, text } = await request.json();

    if (!roomId || !senderId || !senderName || !text) {
      throw badRequest('roomId, senderId, senderName และ text ต้องถูกระบุ');
    }

    const roomData = await sendMessageService(roomId, senderId, senderName, text);
    return jsonResponse(roomData);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

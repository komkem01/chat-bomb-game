import { NextRequest } from 'next/server';
import { getOwnerJoinRequestsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      throw badRequest('ownerId จำเป็นต้องระบุ');
    }

    const requests = await getOwnerJoinRequestsService(params.roomId, ownerId);
    return jsonResponse({ requests });
  } catch (error) {
    return handleErrorResponse(error);
  }
}

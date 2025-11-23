import { NextRequest } from 'next/server';
import { respondJoinRequestService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';
import { query } from '@/lib/server/db';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const { ownerId, decision } = await request.json();

    if (!ownerId || !decision) {
      throw badRequest('ownerId และ decision จำเป็นต้องระบุ');
    }

    const normalizedDecision = decision.toString().toUpperCase();
    if (!['APPROVE', 'DENY'].includes(normalizedDecision)) {
      throw badRequest('decision ต้องเป็น APPROVE หรือ DENY');
    }

    const updatedRequest = await respondJoinRequestService(
      params.requestId,
      ownerId,
      normalizedDecision === 'APPROVE' ? 'APPROVE' : 'DENY'
    );

    return jsonResponse(updatedRequest);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    // ยกเลิก join request โดยผู้เล่น
    await query(
      `DELETE FROM room_join_requests WHERE id = $1 AND status = 'PENDING'`,
      [params.requestId]
    );

    return jsonResponse({ success: true });
  } catch (error) {
    return handleErrorResponse(error);
  }
}

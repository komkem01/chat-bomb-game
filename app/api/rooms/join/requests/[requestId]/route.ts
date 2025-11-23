import { NextRequest } from 'next/server';
import { respondJoinRequestService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { badRequest } from '@/lib/server/errors';

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
      Number(params.requestId),
      ownerId,
      normalizedDecision === 'APPROVE' ? 'APPROVE' : 'DENY'
    );

    return jsonResponse(updatedRequest);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

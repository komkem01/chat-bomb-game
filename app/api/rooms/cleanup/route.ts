import { NextRequest } from 'next/server';
import { cleanupClosedRoomsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { ensureCronAuthorized } from '@/lib/server/cronAuth';

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    ensureCronAuthorized(request);

    let body: { days?: number } | null = null;
    try {
      body = await request.json();
    } catch (error) {
      body = null;
    }

  const days = body?.days;
  const result = await cleanupClosedRoomsService(days ?? 7);
    return jsonResponse(result);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

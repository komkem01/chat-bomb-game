import { NextRequest } from 'next/server';
import { cleanupClosedRoomsService } from '@/lib/server/roomService';
import { handleErrorResponse, handleOptions, jsonResponse } from '@/lib/server/httpHelpers';
import { ensureCronAuthorized } from '@/lib/server/cronAuth';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    ensureCronAuthorized(request);

    const daysParam = request.nextUrl.searchParams.get('days');
    const days = daysParam !== null ? Number(daysParam) : undefined;

    const result = await cleanupClosedRoomsService(Number.isFinite(days) ? Number(days) : undefined);
    return jsonResponse(result);
  } catch (error) {
    return handleErrorResponse(error);
  }
}

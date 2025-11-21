import { NextRequest } from 'next/server';
import { unauthorized } from './errors';

const formatError = () => unauthorized('ไม่สามารถยืนยันตัวตนสำหรับงาน Cron ได้');

export const ensureCronAuthorized = (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // When no secret is set (e.g., local dev), allow the request through.
    return;
  }

  const headerSecret =
    request.headers.get('authorization') ?? request.headers.get('x-cron-secret');

  if (!headerSecret) {
    throw formatError();
  }

  const token = headerSecret.startsWith('Bearer ')
    ? headerSecret.slice(7).trim()
    : headerSecret.trim();

  if (token !== secret) {
    throw formatError();
  }
};

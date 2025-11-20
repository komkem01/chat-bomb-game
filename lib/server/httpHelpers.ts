import { NextResponse } from 'next/server';
import { HttpError } from './errors';

export const jsonResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

export const handleErrorResponse = (error: unknown) => {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
};

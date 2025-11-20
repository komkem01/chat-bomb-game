import { NextResponse } from 'next/server';
import { HttpError } from './errors';

// CORS headers for API routes
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const jsonResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { 
    status,
    headers: corsHeaders,
  });
};

export const handleErrorResponse = (error: unknown) => {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message }, 
      { 
        status: error.status,
        headers: corsHeaders,
      }
    );
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json(
    { error: 'เกิดข้อผิดพลาดภายในระบบ' }, 
    { 
      status: 500,
      headers: corsHeaders,
    }
  );
};

export const handleOptions = () => {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
};

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export async function GET() {
  try {
    // Test database connection
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    const dbInfo = result.rows[0];
    
    return NextResponse.json({ 
      status: 'healthy',
      backend: 'Node.js API routes working',
      database: {
        connected: true,
        currentTime: dbInfo.current_time,
        version: dbInfo.pg_version?.split(' ')[0] || 'PostgreSQL'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return NextResponse.json({ 
      status: 'unhealthy',
      backend: 'Node.js API routes working',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { secret } = await request.json();
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM entries`;
  const count = await sql`SELECT COUNT(*)::int as c FROM entries`;
  return NextResponse.json({ ok: true, remaining: count[0].c, dbUrl: process.env.DATABASE_URL?.slice(0, 40) });
}

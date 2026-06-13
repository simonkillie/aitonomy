import { NextResponse } from 'next/server';
import { getLeaderboard } from '../../../lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const entries = await getLeaderboard();
    return NextResponse.json({ ok: true, entries });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

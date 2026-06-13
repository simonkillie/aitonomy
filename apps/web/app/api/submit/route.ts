import { NextRequest, NextResponse } from 'next/server';
import { insertEntry } from '../../../lib/db';
import { validateSubmitPayload, ValidationError } from '../../../lib/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const data = validateSubmitPayload(body);
    await insertEntry(data);
    return NextResponse.json({ ok: true, message: 'Score submitted successfully' });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error('Submit error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { clearUserCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearUserCookie();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

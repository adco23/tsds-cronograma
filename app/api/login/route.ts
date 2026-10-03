import { NextRequest, NextResponse } from 'next/server';
import { EDITOR_COOKIE, editingEnabled, login } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!editingEnabled()) {
    return NextResponse.json({ error: 'La edición está deshabilitada' }, { status: 403 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const token = typeof body.password === 'string' ? login(body.password) : null;
  if (!token) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(EDITOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(EDITOR_COOKIE);
  return res;
}

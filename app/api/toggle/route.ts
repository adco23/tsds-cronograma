import { NextRequest, NextResponse } from 'next/server';
import { setEstado, type Estado } from '@/lib/notion';

const VALID: Estado[] = ['Sin empezar', 'En curso', 'Listo'];

export async function POST(req: NextRequest) {
  let body: { pageId?: string; estado?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { pageId, estado } = body;
  if (!pageId || !estado || !VALID.includes(estado as Estado)) {
    return NextResponse.json({ error: 'Faltan o son inválidos pageId/estado' }, { status: 400 });
  }

  try {
    await setEstado(pageId, estado as Estado);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

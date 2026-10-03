import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isEditor } from '@/lib/auth';
import { NOMBRE_MAX, setNombre } from '@/lib/notion';

export async function POST(req: NextRequest) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { pageId?: string; nombre?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { pageId } = body;
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  if (!pageId || !nombre || nombre.length > NOMBRE_MAX) {
    return NextResponse.json({ error: 'Faltan o son inválidos pageId/nombre' }, { status: 400 });
  }

  try {
    await setNombre(pageId, nombre);
    // Drop the 60s cache so a reload shows the new title right away.
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isEditor } from '@/lib/auth';
import { isIsoDate, setFecha } from '@/lib/notion';

export async function POST(req: NextRequest) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { pageId?: string; start?: string; end?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { pageId, start } = body;
  const end = body.end || null;
  if (!pageId || !isIsoDate(start) || (end !== null && !isIsoDate(end))) {
    return NextResponse.json({ error: 'Faltan o son inválidos pageId/start/end' }, { status: 400 });
  }
  if (end !== null && end < start) {
    return NextResponse.json({ error: 'La fecha de fin es anterior a la de inicio' }, { status: 400 });
  }

  try {
    // A range that starts and ends the same day is stored as one exact day.
    await setFecha(pageId, start, end === start ? null : end);
    // Drop the 60s cache so a reload shows the new date right away.
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

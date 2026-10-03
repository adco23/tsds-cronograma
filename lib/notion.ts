// Server-only module: talks to the real Notion API with a server-side
// integration token. Never import this from a client component.

const NOTION_VERSION = '2022-06-28';

// TSDS:claude-fechas — the deliverables/deadlines database.
const DATABASE_ID = '3eed47c5-69e1-80ba-88ad-c5a4e106864e';

export type SubjectCode = 'TTS' | 'EMP' | 'GP' | 'PSR' | 'PI';

export const SUBJECTS: Record<SubjectCode, { name: string; color: string }> = {
  TTS: { name: 'Trabajo, Tecnología y Sociedad', color: 'var(--tts)' },
  EMP: { name: 'Emprendedorismo', color: 'var(--emp)' },
  GP: { name: 'Gestión de Proyectos', color: 'var(--gp)' },
  PSR: { name: 'Programación sobre Redes', color: 'var(--psr)' },
  PI: { name: 'Práctica Profesionalizante IV', color: 'var(--pi)' },
};

// Maps each TSDS:materias page id (the "Materia" relation target) to its
// short subject code. These five subjects are fixed for this project.
const SUBJECT_BY_PAGE_ID: Record<string, SubjectCode> = {
  '119d47c5-69e1-8085-ac6e-d8efbf685fb1': 'TTS',
  '119d47c5-69e1-803a-ae2b-f1d876e1ecaa': 'EMP',
  '119d47c5-69e1-8059-bc14-caadd40dd051': 'GP',
  '119d47c5-69e1-8085-bb8a-fa253ba0d5f2': 'PSR',
  '119d47c5-69e1-80bd-ab52-eff7624b16ac': 'PI',
};

export type Estado = 'Sin empezar' | 'En curso' | 'Listo';

export type Entry = {
  id: string;
  nombre: string;
  subject: SubjectCode;
  tipo: string;
  semana: number;
  start: string;
  end: string;
  /** true when the source gave one exact day rather than a week range */
  exact: boolean;
  estado: Estado;
};

// Monday of week 1 of the term. "Semana" in Notion is a plain number, so it
// has to be recomputed from this whenever a date moves.
const SEMANA_1 = '2026-08-10';

const DAY_MS = 86400000;

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** true for a real calendar day written as YYYY-MM-DD */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return utcToIso(isoToUtc(value)) === value;
}

export function semanaOf(iso: string): number {
  return Math.floor((isoToUtc(iso) - isoToUtc(SEMANA_1)) / (7 * DAY_MS)) + 1;
}

/** Monday–Sunday span of a given week of the term */
export function weekRange(semana: number): { start: string; end: string } {
  const start = isoToUtc(SEMANA_1) + (semana - 1) * 7 * DAY_MS;
  return { start: utcToIso(start), end: utcToIso(start + 6 * DAY_MS) };
}

function getToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      'Falta la variable de entorno NOTION_TOKEN. Creá una integración en notion.so/my-integrations, ' +
        'compartí la base TSDS:claude-fechas con ella y configurá el token en Vercel.'
    );
  }
  return token;
}

async function notionFetch(path: string, init: RequestInit) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }

  return res.json();
}

type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

function pageToEntry(page: NotionPage): Entry {
  const props = page.properties;

  const materiaId: string | undefined = props.Materia?.relation?.[0]?.id?.replace(/-/g, '');
  const normalizedId = materiaId
    ? `${materiaId.slice(0, 8)}-${materiaId.slice(8, 12)}-${materiaId.slice(12, 16)}-${materiaId.slice(
        16,
        20
      )}-${materiaId.slice(20)}`
    : undefined;
  const subject = (normalizedId && SUBJECT_BY_PAGE_ID[normalizedId]) || 'TTS';

  const dateStart: string = props.Fecha?.date?.start ?? '';
  const dateEnd: string | null = props.Fecha?.date?.end ?? null;

  return {
    id: page.id,
    nombre: (props.Nombre?.title ?? []).map((t: any) => t.plain_text).join(''),
    subject,
    tipo: props.Tipo?.select?.name ?? '',
    semana: props.Semana?.number ?? 0,
    start: dateStart,
    end: dateEnd ?? dateStart,
    exact: !dateEnd,
    estado: (props.Estado?.status?.name as Estado) ?? 'Sin empezar',
  };
}

export async function getEntries(): Promise<Entry[]> {
  const entries: Entry[] = [];
  let cursor: string | undefined;

  do {
    const data = await notionFetch(`/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({
        start_cursor: cursor,
        sorts: [{ property: 'Fecha', direction: 'ascending' }],
        page_size: 100,
      }),
      // Re-fetch from Notion at most once a minute.
      next: { revalidate: 60 },
    });

    for (const page of data.results as NotionPage[]) {
      entries.push(pageToEntry(page));
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return entries;
}

export async function setEstado(pageId: string, estado: Estado): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        Estado: { status: { name: estado } },
      },
    }),
  });
}

export const NOMBRE_MAX = 200;

export async function setNombre(pageId: string, nombre: string): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        Nombre: { title: [{ text: { content: nombre } }] },
      },
    }),
  });
}

/** Pass end = null for a single exact day. Also moves the entry to the matching "Semana". */
export async function setFecha(pageId: string, start: string, end: string | null): Promise<void> {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: {
        Fecha: { date: { start, end } },
        Semana: { number: semanaOf(start) },
      },
    }),
  });
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { NOMBRE_MAX, SUBJECTS, semanaOf, weekRange, type Entry, type SubjectCode } from '@/lib/notion';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmt(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function fmtRange(e: Entry) {
  if (e.exact) return fmt(e.start);
  return `${fmt(e.start)} – ${fmt(e.end)}`;
}

function daysUntil(iso: string) {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function currentWeek(entries: Entry[]) {
  const now = new Date();
  for (const e of entries) {
    if (new Date(e.start) <= now && now <= new Date(`${e.end}T23:59:59`)) return e.semana;
  }
  return null;
}

const SUBJECT_CODES = Object.keys(SUBJECTS) as SubjectCode[];

export default function Timeline({
  initialEntries,
  canEdit,
}: {
  initialEntries: Entry[];
  canEdit: boolean;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [active, setActive] = useState<Set<SubjectCode>>(new Set(SUBJECT_CODES));
  const [pending, startTransition] = useTransition();
  const [errorId, setErrorId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ start: '', end: '' });
  const [editingNombreId, setEditingNombreId] = useState<string | null>(null);
  const [nombreDraft, setNombreDraft] = useState('');

  const cw = useMemo(() => currentWeek(entries), [entries]);

  const weeks = useMemo(() => {
    const ws = [...new Set(entries.map((e) => e.semana))].sort((a, b) => a - b);
    return ws;
  }, [entries]);

  const hero = useMemo(() => {
    const upcoming = entries
      .filter((e) => e.exact)
      .map((e) => ({ e, d: daysUntil(e.start) }))
      .filter((x) => x.d >= 0)
      .sort((a, b) => a.d - b.d);
    return upcoming[0] ?? null;
  }, [entries]);

  function toggleSubject(code: SubjectCode) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next.size === 0 ? new Set(SUBJECT_CODES) : next;
    });
  }

  function toggleDone(entry: Entry) {
    const nextEstado = entry.estado === 'Listo' ? 'Sin empezar' : 'Listo';
    const prevEntries = entries;

    // optimistic update
    setEntries((es) => es.map((e) => (e.id === entry.id ? { ...e, estado: nextEstado } : e)));
    setErrorId(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: entry.id, estado: nextEstado }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setEntries(prevEntries);
        setErrorId(entry.id);
      }
    });
  }

  function openEditor(entry: Entry) {
    setEditingId(entry.id);
    setDraft({ start: entry.start, end: entry.exact ? '' : entry.end });
    setErrorId(null);
  }

  const draftValid = draft.start !== '' && (draft.end === '' || draft.end >= draft.start);

  function saveFecha(entry: Entry) {
    if (!draftValid) return;
    const start = draft.start;
    const exact = draft.end === '' || draft.end === start;
    const end = exact ? start : draft.end;
    const prevEntries = entries;

    // optimistic update: the entry may land in another week, so keep date order
    setEntries((es) =>
      es
        .map((e) => (e.id === entry.id ? { ...e, start, end, exact, semana: semanaOf(start) } : e))
        .sort((a, b) => a.start.localeCompare(b.start))
    );
    setEditingId(null);
    setErrorId(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/fecha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: entry.id, start, end: exact ? null : end }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setEntries(prevEntries);
        setErrorId(entry.id);
      }
    });
  }

  function openNombreEditor(entry: Entry) {
    setEditingNombreId(entry.id);
    setNombreDraft(entry.nombre);
    setErrorId(null);
  }

  function saveNombre(entry: Entry) {
    const nombre = nombreDraft.trim();
    if (!nombre) return;
    setEditingNombreId(null);
    if (nombre === entry.nombre) return;
    const prevEntries = entries;

    // optimistic update
    setEntries((es) => es.map((e) => (e.id === entry.id ? { ...e, nombre } : e)));
    setErrorId(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/nombre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: entry.id, nombre }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setEntries(prevEntries);
        setErrorId(entry.id);
      }
    });
  }

  return (
    <div>
      {/* Hero */}
      <div className="flex items-center gap-4 rounded-[14px] border border-border bg-panel p-[18px_20px] shadow-card">
        {hero ? (
          <>
            <div
              className="min-w-[58px] text-center font-display text-[34px] font-bold leading-none"
              style={{ color: SUBJECTS[hero.e.subject].color }}
            >
              {hero.d}
              <small className="mt-[3px] block font-body text-[11px] font-semibold text-mute">
                {hero.d === 1 ? 'día' : 'días'}
              </small>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-[3px] text-xs font-semibold text-mute">Próxima fecha fija</p>
              <p className="text-[15px] font-semibold text-text">
                {hero.e.nombre}
                <span
                  className="ml-1.5 font-display text-[11px] font-bold"
                  style={{ color: SUBJECTS[hero.e.subject].color }}
                >
                  {hero.e.subject}
                </span>
                {' — '}
                {fmt(hero.e.start)}
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="mb-[3px] text-xs font-semibold text-mute">Cuatrimestre</p>
            <p className="text-[15px] font-semibold text-text">No quedan fechas fijas por delante.</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-1.5 mt-5 flex flex-wrap gap-2">
        {SUBJECT_CODES.map((code) => {
          const isActive = active.has(code);
          const color = SUBJECTS[code].color;
          return (
            <button
              key={code}
              type="button"
              title={SUBJECTS[code].name}
              onClick={() => toggleSubject(code)}
              className="flex items-center gap-1.5 rounded-full border px-[13px] py-[7px] font-body text-[13px] font-semibold transition-transform active:scale-95"
              style={{
                borderColor: isActive ? 'transparent' : 'var(--border)',
                background: isActive ? color : 'var(--panel)',
                color: isActive ? '#fff' : color,
              }}
            >
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: isActive ? '#fff' : color, opacity: isActive ? 0.9 : 0.55 }}
              />
              {code}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="mt-5">
        {weeks.map((w) => {
          const weekEntries = entries.filter((e) => e.semana === w && active.has(e.subject));
          if (weekEntries.length === 0) return null;
          const range = weekRange(w);

          return (
            <div key={w} className="grid grid-cols-[106px_1fr] gap-3">
              <div className="relative pl-5 pt-0.5">
                <div
                  className={`font-display text-[13px] font-bold leading-[17px] ${w === cw ? 'text-text' : 'text-mute'}`}
                >
                  S{String(w).padStart(2, '0')}
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-mute">
                  {fmt(range.start)} – {fmt(range.end)}
                </div>
                <span
                  className="absolute left-0 top-[6px] h-[9px] w-[9px] rounded-full"
                  style={{
                    background: w === cw ? 'var(--text)' : 'var(--text-mute)',
                    boxShadow: w === cw ? '0 0 0 4px color-mix(in srgb, var(--text) 15%, transparent)' : 'none',
                  }}
                />
                {w !== weeks[weeks.length - 1] && (
                  <span className="absolute bottom-0 left-1 top-[23px] w-px bg-border" />
                )}
              </div>

              <div className="flex flex-col gap-2 pb-5">
                {weekEntries.map((e) => {
                  const isDone = e.estado === 'Listo';
                  const color = SUBJECTS[e.subject].color;
                  return (
                    <div
                      key={e.id}
                      className={`flex items-start gap-2.5 rounded-[10px] border border-l-[3px] border-border bg-panel p-[11px_14px] shadow-card transition-opacity ${
                        isDone ? 'opacity-50' : ''
                      }`}
                      style={{ borderLeftColor: color }}
                    >
                      <button
                        type="button"
                        aria-label="Marcar como hecho"
                        onClick={() => toggleDone(e)}
                        disabled={pending || !canEdit}
                        className="mt-px grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[6px] border-[1.5px]"
                        style={{
                          borderColor: isDone ? color : 'var(--border)',
                          background: isDone ? color : 'var(--panel-raised)',
                        }}
                      >
                        {isDone && <span className="text-[12px] font-bold text-white">✓</span>}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-display text-[11px] font-bold" style={{ color }}>
                            {e.subject}
                          </span>
                          <span className="rounded-full border border-border bg-panel-raised px-[7px] py-px text-[11px] font-semibold text-mute">
                            {e.tipo}
                          </span>
                          {errorId === e.id && (
                            <span className="text-[11px] font-semibold text-red-500">
                              no se pudo guardar
                            </span>
                          )}
                        </div>
                        {editingNombreId === e.id ? (
                          <form
                            className="flex flex-wrap items-center gap-2"
                            onSubmit={(ev) => {
                              ev.preventDefault();
                              saveNombre(e);
                            }}
                          >
                            <input
                              type="text"
                              required
                              autoFocus
                              aria-label="Título"
                              maxLength={NOMBRE_MAX}
                              value={nombreDraft}
                              onChange={(ev) => setNombreDraft(ev.target.value)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Escape') setEditingNombreId(null);
                              }}
                              className="min-w-0 flex-1 basis-[220px] rounded-[6px] border border-border bg-panel-raised px-2 py-1 font-body text-sm font-medium text-text"
                            />
                            <button
                              type="submit"
                              disabled={!nombreDraft.trim() || pending}
                              className="rounded-[6px] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              style={{ background: color }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNombreId(null)}
                              className="rounded-[6px] border border-border px-2.5 py-1 text-xs font-semibold text-mute"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : !canEdit ? (
                          <div
                            className={`text-sm font-medium leading-snug text-text ${
                              isDone ? 'line-through' : ''
                            }`}
                          >
                            {e.nombre}
                          </div>
                        ) : (
                          <button
                            type="button"
                            title="Editar título"
                            onClick={() => openNombreEditor(e)}
                            className={`block text-left text-sm font-medium leading-snug text-text ${
                              isDone ? 'line-through' : ''
                            }`}
                          >
                            {e.nombre}
                          </button>
                        )}
                        {editingId === e.id ? (
                          <form
                            className="mt-1.5 flex flex-wrap items-end gap-2"
                            onSubmit={(ev) => {
                              ev.preventDefault();
                              saveFecha(e);
                            }}
                          >
                            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-mute">
                              Desde
                              <input
                                type="date"
                                required
                                autoFocus
                                value={draft.start}
                                onChange={(ev) => setDraft((d) => ({ ...d, start: ev.target.value }))}
                                className="rounded-[6px] border border-border bg-panel-raised px-2 py-1 font-body text-xs font-medium text-text"
                              />
                            </label>
                            <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-mute">
                              Hasta (opcional)
                              <input
                                type="date"
                                min={draft.start}
                                value={draft.end}
                                onChange={(ev) => setDraft((d) => ({ ...d, end: ev.target.value }))}
                                className="rounded-[6px] border border-border bg-panel-raised px-2 py-1 font-body text-xs font-medium text-text"
                              />
                            </label>
                            <button
                              type="submit"
                              disabled={!draftValid || pending}
                              className="rounded-[6px] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              style={{ background: color }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-[6px] border border-border px-2.5 py-1 text-xs font-semibold text-mute"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : !canEdit ? (
                          <div className="mt-0.5 text-xs text-mute">{fmtRange(e)}</div>
                        ) : (
                          <button
                            type="button"
                            title="Editar fecha"
                            onClick={() => openEditor(e)}
                            className="mt-0.5 text-xs text-mute underline decoration-dotted underline-offset-2 hover:text-text"
                          >
                            {fmtRange(e)} ✎
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

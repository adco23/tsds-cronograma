import { getEntries } from '@/lib/notion';
import Timeline from '@/components/Timeline';

export const revalidate = 60;

export default async function Page() {
  let entries: Awaited<ReturnType<typeof getEntries>> = [];
  let error: string | null = null;

  try {
    entries = await getEntries();
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-20 pt-7">
      <header className="mb-5">
        <p className="mb-1.5 font-display text-[13px] font-semibold tracking-wide text-mute">
          IFTS N° 29 · Tecnicatura Superior en Desarrollo de Software
        </p>
        <h1 className="mb-1 font-display text-[26px] font-bold leading-tight tracking-tight text-text">
          Cronograma de entregas
        </h1>
        <p className="text-sm text-dim">
          2° Cuatrimestre 2026 — TTS, Emprendedorismo, Gestión de Proyectos, Redes y Práctica
          Profesionalizante IV
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-border bg-panel p-5 text-sm text-dim shadow-card">
          <p className="mb-1 font-display font-semibold text-text">No pude leer la base de Notion</p>
          <p>{error}</p>
        </div>
      ) : (
        <Timeline initialEntries={entries} />
      )}

      <footer className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-mute">
        Semana 1 = 10/08. Las fechas sin día exacto muestran el rango de esa semana de cursada. Tocá el
        círculo de cada entrega para marcarla como hecha — se guarda en la base de Notion.
      </footer>
    </main>
  );
}

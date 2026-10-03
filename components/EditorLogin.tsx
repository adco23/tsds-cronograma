'use client';

import { useState } from 'react';

export default function EditorLogin({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(method: 'POST' | 'DELETE') {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch('/api/login', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ password }) : undefined,
      });
      if (!res.ok) throw new Error();
      // Reload so the server re-renders the page with the new permissions.
      window.location.reload();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  if (canEdit) {
    return (
      <button type="button" disabled={busy} onClick={() => send('DELETE')} className="underline">
        Salir del modo edición
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="underline">
        Entrar para editar
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        send('POST');
      }}
    >
      <input
        type="password"
        required
        autoFocus
        aria-label="Contraseña"
        placeholder="Contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        className="rounded-[6px] border border-border bg-panel-raised px-2 py-1 font-body text-xs font-medium text-text"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-[6px] border border-border px-2.5 py-1 text-xs font-semibold text-text disabled:opacity-50"
      >
        Entrar
      </button>
      {error && <span className="font-semibold text-red-500">contraseña incorrecta</span>}
    </form>
  );
}

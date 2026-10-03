# Cronograma TSDS

Timeline de entregas, PFO, parciales, coloquios y recuperatorios del 2° cuatrimestre 2026 (TSDS, IFTS N° 29), con la base de Notion **`TSDS:claude-fechas`** como única fuente de datos. Hecho con Next.js (App Router) para desplegar en Vercel.

- La página lee la base en cada visita (con cache de 60s).
- Tocar el círculo de una entrega la marca "Listo" en Notion directamente (y al revés), así se puede seguir editando todo desde Notion o desde acá.
- Tocar la fecha de una entrega abre un editor (día único o rango); al guardar se actualizan `Fecha` y `Semana` en Notion.
- Tocar el título de una entrega permite renombrarla; se guarda en `Nombre` en Notion.
- Filtros por materia, y un contador de días hasta la próxima fecha fija (parciales con día exacto).

## 1. Crear la integración de Notion

1. Entrá a [notion.so/my-integrations](https://www.notion.so/my-integrations) y creá una integración interna (cualquier nombre, por ejemplo "Cronograma TSDS").
2. Copiá el **Internal Integration Secret** (empieza con `secret_` o `ntn_`).
3. Abrí la base **TSDS:claude-fechas** en Notion → `···` → **Connections** → conectá la integración que acabás de crear. Sin este paso la base le va a devolver 404 a la app aunque el token sea correcto.

## 2. Correrlo en local (opcional)

```bash
npm install
cp .env.example .env.local   # pegá ahí tu NOTION_TOKEN
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## 3. Desplegar en Vercel

1. Subí esta carpeta a un repo de GitHub (o usá `vercel` CLI directo desde acá).
2. En [vercel.com/new](https://vercel.com/new) importá el repo — Vercel detecta Next.js solo, no hace falta tocar nada del build.
3. En **Project Settings → Environment Variables** agregá:
   - `NOTION_TOKEN` = el secret del paso 1.
   - `EDIT_PASSWORD` = una contraseña larga, solo para vos. La página es pública para leer; para editar hay que tocar "Entrar para editar" al pie e ingresarla (queda guardada un año en ese navegador). Sin esta variable nadie puede editar.
4. Deploy. Listo — cada visita a la URL pública va a reflejar lo que haya en Notion (con hasta 1 minuto de demora por el cache).

### Con la CLI de Vercel, en vez de GitHub

```bash
npm i -g vercel
vercel link
vercel env add NOTION_TOKEN production
vercel --prod
```

## Estructura

```
app/
  page.tsx            — server component: trae las entregas de Notion
  api/toggle/route.ts — endpoint que actualiza "Estado" en Notion
  api/fecha/route.ts  — endpoint que actualiza "Fecha" y "Semana" en Notion
  api/nombre/route.ts — endpoint que actualiza "Nombre" en Notion
  layout.tsx, globals.css
components/
  Timeline.tsx         — UI del timeline (filtros, semanas, check de "Listo")
lib/
  notion.ts            — fetch/patch contra la API de Notion (server-only)
```

## Si cambia algo del cronograma

Las fechas, materias y textos viven en Notion (`TSDS:claude-fechas`): editar ahí alcanza, no hace falta tocar código ni redeployar. Solo hay que tocar `lib/notion.ts` si en algún momento agregás una materia nueva (el mapeo de página de Notion → sigla está hardcodeado ahí) o cambiás el nombre de alguna propiedad de la base.

# SPEC 04 — Conexión de Supabase con Next.js

> **Status:** implementado
> **Depends on:** SPEC 03
> **Date:** 2026-11-23
> **Objective:** Dejar la app Next.js conectada al proyecto Supabase existente (paquetes, variables de entorno y clientes de navegador y servidor), sin crear tablas, campos ni cambios en el dashboard.

---

## Por qué existe esta spec

El proyecto Supabase ya existe (`.mcp.json`, ref `aknsvkkafftjxhkayywr`) pero la app no tiene ningún paquete de Supabase ni variables de entorno para él. Esta spec solo deja la conexión lista. El login, las puntuaciones y cualquier uso de datos van en specs futuras, que ya encontrarán los clientes creados.

---

## Scope

**In:**

- Paquetes `@supabase/supabase-js` y `@supabase/ssr`.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.example` (vacías) y `.env.local` (valores reales, no versionado).
- `lib/supabase/client.ts`: cliente para componentes del navegador.
- `lib/supabase/server.ts`: cliente para Server Components y Server Actions, con las cookies de Next.
- Verificación de la conexión desde el servidor con un archivo temporal que se elimina después.

**Out of scope (para specs futuras):**

- Crear o modificar tablas, campos, políticas RLS, triggers, funciones o migraciones. La base de datos no se toca.
- Cualquier cambio en el dashboard de Supabase.
- Autenticación real: `/auth`, `components/session-provider.tsx` y `av_user` quedan como están.
- Guardar puntuaciones en Supabase; `av_scores` sigue en localStorage.
- `proxy.ts` y refresco de sesión: solo hacen falta cuando exista auth real.
- Tipos generados de la base de datos (`database.types.ts`): no hay tablas que tipar.
- Ruta o endpoint público de salud.
- Tests automatizados (no hay runner configurado).

---

## Data model

Esta feature no introduce datos ni estructuras nuevas. Solo variables de entorno:

| Variable                               | Ejemplo                                    |
| -------------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://aknsvkkafftjxhkayywr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                       |

Convenciones:

- Ambas llevan `NEXT_PUBLIC_` porque el cliente del navegador las necesita. La publishable key está pensada para ser pública; la protege RLS.
- Nunca se usa la `service_role` key en la app.

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>;
```

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` las guías de `cookies()` y de `cacheComponents` (activo en `next.config.ts`) antes de escribir código Next.js. Consultar la guía de Supabase SSR para Next.js con `search_docs` del MCP.
2. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Obtener URL y publishable key con `get_project_url` y `get_publishable_keys` (solo lectura). Añadir las dos variables a `.env.example` (vacías) y a `.env.local`. Verificación: `npm run build` pasa.
3. Crear `lib/supabase/client.ts` con `createBrowserClient`.
4. Crear `lib/supabase/server.ts` con `createServerClient` y `getAll`/`setAll` sobre `await cookies()`.
5. Verificar la conexión: crear un archivo temporal `app/_supabase-check/page.tsx` (Server Component) que usa el cliente del servidor y pide `GET {URL}/auth/v1/settings` con la cabecera `apikey`; debe responder 200. Abrirlo con `npm run dev`, comprobar, y eliminar el archivo. No se crea ninguna tabla ni se consulta ninguna.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacías; `.env.local` no está versionado.
- [ ] Existen `lib/supabase/client.ts` y `lib/supabase/server.ts`.
- [ ] La comprobación temporal desde el servidor recibe 200 de Supabase y el archivo temporal ya no existe.
- [ ] `list_tables` sigue devolviendo `[]` (no se creó ninguna tabla).
- [ ] `list_migrations` sigue vacío (no se aplicó ninguna migración).
- [ ] No existen `proxy.ts` ni `middleware.ts`.
- [ ] Ningún archivo versionado contiene la publishable key ni la `service_role` key.
- [ ] Las pantallas de las SPEC 01–03 (`/`, `/juegos`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/acerca`, `/auth`) siguen funcionando sin errores en la consola.

---

## Decisions

- **Yes:** solo conexión. Decisión del usuario: sin tablas, campos, migraciones ni dashboard.
- **No:** auth real y tabla `profiles`. Exigen base de datos y configuración del dashboard; van en otra spec si se decide.
- **Yes:** `@supabase/ssr` + `@supabase/supabase-js`. Patrón oficial para App Router; deja el servidor listo para leer cookies cuando haya sesión.
- **No:** solo `supabase-js`. Habría que reemplazarlo al llegar la auth.
- **No:** `proxy.ts` ahora. Sin sesiones no refresca nada; se añade con la spec de auth.
- **Yes:** publishable key como `NEXT_PUBLIC_`. Está diseñada para el cliente.
- **No:** `service_role` key en la app. Salta RLS y no hace falta aquí.
- **Yes:** verificación con archivo temporal y petición a `/auth/v1/settings`. Prueba la conexión real sin necesitar tablas ni dejar rutas públicas.
- **No:** `/api/health` permanente. Un endpoint público que mantener sin uso real.
- **No:** `generate_typescript_types`. Sin tablas el archivo saldría vacío.

---

## Risks

| Riesgo                                                                             | Mitigación                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Variables ausentes en otro entorno rompen los clientes                             | `.env.example` las documenta; los clientes fallan al crearse, no al compilar.                                      |
| `cookies()` con `cacheComponents` falla en prerender                               | `server.ts` solo se invoca desde Server Actions o componentes dinámicos; el paso 1 obliga a leer la documentación. |
| La publishable key se sube al repo por error                                       | `.env.local` ya está ignorado; el criterio de aceptación revisa los archivos versionados.                          |
| El proyecto Supabase gratuito está pausado por inactividad y la comprobación falla | Reanudarlo desde el dashboard y repetir el paso 5.                                                                 |

---

## What is **not** in this spec

- Tablas, campos, migraciones, RLS o cambios en el dashboard.
- Autenticación real y perfiles.
- Puntuaciones en Supabase.
- `proxy.ts` y refresco de sesión.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.

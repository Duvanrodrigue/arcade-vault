# SPEC 03 — Acerca de y formulario de contacto con Resend

> **Status:** implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-09
> **Objective:** Portar a Next.js la pantalla "Acerca de" del prototipo `references/resources/templates/home-about/about.jsx` en `/acerca`, con su formulario de contacto enviando el mensaje al equipo por correo mediante Resend.

---

## Por qué existe esta spec

La SPEC 02 dejó fuera la pantalla "Acerca de" y su formulario de contacto, junto con el link "Acerca de" del nav. El prototipo (`home-about/about.jsx`, `nav.jsx`, `styles.css`) define ambos. En el prototipo el envío es simulado (`setSent(...)`); aquí el envío es real vía Resend, desde el servidor.

El CSS de esta pantalla (`.about-*`, `.highlight*`, `.div-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `@keyframes shake` y `pxblink`) no está en `app/globals.css`; vive en `references/resources/templates/home-about/styles.css` (bloque `/* ===== ABOUT PAGE ===== */`, desde la línea ~1071). `.reveal`, `.field`, `.kicker`, `.fade-in`, `.btn.xl` y `@keyframes blink` ya existen en `globals.css`.

---

## Scope

**In:**

- Nueva página `/acerca`, fiel al prototipo, con:
  - Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 tarjetas destacadas con icono SVG pixel (`HEART` magenta, `BROWSER` cyan, `PLANT` green).
  - Divisor decorativo (`aria-hidden`) con 24 píxeles parpadeantes.
  - Sección de contacto (`.reveal`): kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 tips con LED ("RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS", "SIN SPAM, JAMÁS") y formulario.
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶  ENVIAR MENSAJE", comportamiento del prototipo:
  - Validación en cliente: si falta algún campo (tras `trim`), el formulario hace `shake` 400 ms y no envía.
  - Éxito: reemplaza los campos por la terminal "VAULT-OS // TERMINAL" con el texto exacto del prototipo y "GRACIAS, {NOMBRE EN MAYÚSCULAS}."; botón "ENVIAR OTRO MENSAJE" reinicia el formulario.
- Envío real con una **Server Action** que usa el SDK `resend`:
  - Valida en servidor nombre, correo y mensaje (obligatorios, formato de correo, límites de longitud).
  - Envía un correo al equipo con `reply_to` = correo del visitante.
  - Devuelve un resultado tipado; el cliente solo muestra éxito si el servidor confirma el envío.
- Estado de error de envío (no existe en el prototipo): el formulario conserva lo escrito, hace `shake` y muestra una línea roja estilo terminal bajo el botón: `[ERROR] No se pudo enviar. Intenta de nuevo.`
- Estado "enviando": el botón queda deshabilitado con texto "ENVIANDO…" mientras la acción está pendiente.
- Configuración por variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`. Archivo `.env.example` sin secretos.
- Nav (escritorio y panel móvil): añadir link "Acerca de" a `/acerca`, con estado activo (`pathname === "/acerca"`), después de "Salón de la Fama".
- Animación de entrada por scroll reutilizando `components/reveal.tsx` (SPEC 02).
- Portar a `app/globals.css` solo las reglas CSS de Acerca de/contacto que faltan.
- Metadata de la página: título "Acerca de · Arcade Vault".
- Textos en español, tal como en el prototipo.
- Diseño de interfaces con el skill `frontend-design`, según `CLAUDE.md`.

**Out of scope (para specs futuras):**

- Correo de confirmación al visitante (requiere dominio verificado en Resend).
- Dominio propio verificado en Resend; el remitente es `onboarding@resend.dev` (solo entrega al correo de la cuenta Resend, suficiente para desarrollo y MVP).
- Honeypot, CAPTCHA y rate limit por IP (sin almacenamiento/backend; el copy "SIN SPAM, JAMÁS" es solo texto).
- Guardar los mensajes en base de datos o historial.
- Plantilla de correo HTML elaborada (el correo es texto plano).
- Links del footer u otras pantallas que apunten a "Acerca de", salvo el nav.
- Tests automatizados (no hay runner configurado).
- Rediseñar el nav más allá de añadir "Acerca de".

---

## Data model

No hay persistencia. Solo tipos del contrato de la Server Action y variables de entorno.

```ts
// lib/contact.ts  (sin "use server": tipos y validación compartibles)
export const CONTACT_LIMITS = { name: 80, email: 120, message: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }                 // name ya recortado, para "GRACIAS, {NAME}."
  | { ok: false; error: "invalid" | "send_failed" };

export function validateContact(input: unknown): ContactInput | null;
```

```ts
// app/acerca/actions.ts
"use server";
export async function sendContact(input: ContactInput): Promise<ContactResult>;
```

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

| Variable | Ejemplo | Uso |
| -------- | ------- | --- |
| `RESEND_API_KEY` | `re_...` | Autenticación con Resend. |
| `CONTACT_TO_EMAIL` | correo de la cuenta Resend | Destinatario del equipo. |
| `CONTACT_FROM_EMAIL` | `Arcade Vault <onboarding@resend.dev>` | Remitente. |

Convenciones:

- Asunto del correo: `[Arcade Vault] Nuevo mensaje de {name}`.
- Cuerpo en texto plano: nombre, correo y mensaje, cada uno etiquetado.
- `validateContact` recorta (`trim`) los tres campos, exige que no estén vacíos, que `email` coincida con un patrón básico `x@y.z` y que respeten `CONTACT_LIMITS`. Retorna `null` si algo falla.
- Si falta alguna variable de entorno, la acción devuelve `{ ok: false, error: "send_failed" }` y registra el motivo con `console.error` (sin imprimir la API key).

---

## Implementation plan

Cada paso deja la app compilando y ejecutable (`npm run dev`).

1. Leer en `node_modules/next/dist/docs/` las guías de Server Actions (`use server`, formularios, `useTransition`/`useActionState`) y de metadata antes de escribir código Next.js (`cacheComponents` está activo en `next.config.ts`).
2. Instalar `resend` (`npm install resend`). Crear `.env.example` con las tres variables vacías y añadir `!.env.example` a `.gitignore` (hoy `.env*` lo ignora). Crear `.env.local` local (no versionado) con valores reales. Verificación: `npm run build` sigue pasando.
3. Portar el CSS: copiar a `app/globals.css` las reglas del bloque `ABOUT PAGE` de `home-about/styles.css` que no existen (incluye `.contact-form textarea`, `.terminal-success`, `.term-*`, keyframes `shake` y `pxblink`). Añadir la regla del estado de error (`.form-error`, rojo, mono) y estilo del botón deshabilitado si falta. No duplicar reglas existentes (comparar selector a selector con `.field`, `.kicker`, `.reveal`). Verificación: `npm run build` sin errores de CSS.
4. Crear `lib/contact.ts` con `CONTACT_LIMITS`, tipos y `validateContact`.
5. Crear `app/acerca/actions.ts` con `sendContact`: valida con `validateContact`, lee las variables de entorno, llama a `new Resend(key).emails.send({ from, to, replyTo, subject, text })`, y mapea cualquier error de Resend (`error` en la respuesta o excepción) a `send_failed`. Verificación: llamar la acción con datos válidos entrega el correo al buzón configurado; con datos inválidos devuelve `invalid`.
6. Crear `components/highlight-icon.tsx` (presentacional, SVG de `HEART`, `BROWSER`, `PLANT` copiado del prototipo).
7. Crear `components/contact-form.tsx` (client): estado `form`, `sent`, `shake`, `pending`, `failed`; validación cliente del prototipo; llamada a `sendContact`; terminal de éxito con `ENVIAR OTRO MENSAJE`; línea `[ERROR]` en fallo. Campos con `maxLength` de `CONTACT_LIMITS`, `name`/`autoComplete`, `aria-live="polite"` en el área de resultado.
8. Crear `app/acerca/page.tsx` (Server Component) con hero, divisor y sección de contacto envuelta en `<Reveal>`; metadata "Acerca de · Arcade Vault". Verificación: `/acerca` se ve igual que el prototipo.
9. Actualizar `components/nav.tsx`: link "Acerca de" (`/acerca`) en escritorio y panel móvil, con `inAbout = pathname === "/acerca"`.
10. Revisar contra el prototipo (`arcade-vault-standalone.html` en `home-about/`): espaciado, `highlight-row` y `contact-grid` apilados por debajo de 900/820 px, estados de error y éxito. Probar con Playwright (screenshots en `.playwright-screenshots/`) un envío real.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores de TypeScript ni de compilación.
- [ ] `npm run lint` termina sin errores.
- [ ] `/acerca` muestra el título "ACERCA DE ARCADE VAULT", el párrafo de misión y exactamente 3 tarjetas destacadas con icono.
- [ ] El divisor contiene 24 píxeles y tiene `aria-hidden="true"`.
- [ ] La sección de contacto muestra "CONTÁCTANOS", el subtítulo y los 3 tips con LED.
- [ ] El formulario tiene los campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE y el botón "▶  ENVIAR MENSAJE".
- [ ] Enviar con cualquier campo vacío (o solo espacios) hace `shake` y no llama al servidor (sin petición de red).
- [ ] Enviar datos válidos con las variables de entorno correctas entrega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Nuevo mensaje de {nombre}`, con nombre, correo y mensaje en el cuerpo.
- [ ] Al pulsar "Responder" en ese correo, el destinatario es el correo del visitante (`reply_to`).
- [ ] Tras un envío exitoso aparece la terminal "VAULT-OS // TERMINAL" con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE EN MAYÚSCULAS}."
- [ ] "ENVIAR OTRO MENSAJE" muestra el formulario con los campos vacíos.
- [ ] Mientras el envío está pendiente, el botón está deshabilitado y dice "ENVIANDO…"; no se puede enviar dos veces.
- [ ] Con `RESEND_API_KEY` inválida o ausente, el formulario conserva lo escrito, hace `shake`, muestra `[ERROR] No se pudo enviar. Intenta de nuevo.` y no muestra la terminal de éxito.
- [ ] Una llamada directa a la acción con correo mal formado o texto que excede `CONTACT_LIMITS` devuelve `{ ok: false, error: "invalid" }` y no envía correo.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en el HTML (búsqueda en `.next/static` sin coincidencias).
- [ ] `.env.example` está versionado, sin secretos; `.env.local` no lo está.
- [ ] El nav muestra "Acerca de" en escritorio y panel móvil; está activo en `/acerca` y solo ahí.
- [ ] Las secciones `.reveal` pasan a visibles al hacer scroll; con `prefers-reduced-motion: reduce` son visibles sin transición.
- [ ] Por debajo de 900 px las tarjetas destacadas y la rejilla de contacto se apilan sin scroll horizontal.
- [ ] Recargar `/acerca` no produce errores de hidratación ni errores en la consola.
- [ ] Las pantallas de las SPEC 01 y 02 (`/`, `/juegos`, `/juegos/[id]`, `/salon`, `/auth`) siguen funcionando sin errores en la consola.

---

## Decisions

- **Yes:** Server Action para el envío. Sin endpoint público que mantener y encaja con App Router; la clave de Resend queda solo en servidor.
- **No:** Route Handler `POST /api/contacto`. Solo se justificaría si otro cliente consumiera el endpoint.
- **Yes:** ruta `/acerca`. Coherente con rutas en español (`/juegos`, `/salon`, `/auth`).
- **No:** `/about`. Rompe la coherencia de idioma de las rutas.
- **Yes:** remitente `onboarding@resend.dev` y destinatario en `CONTACT_TO_EMAIL`, ambos por variable de entorno. Funciona sin dominio verificado; cambiar a dominio propio es solo cambiar variables.
- **No:** correos fijos en el código. Exponen datos en el repo y obligan a editar código para cambiarlos.
- **Yes:** `reply_to` = correo del visitante. El equipo responde directo desde su bandeja.
- **No:** correo de confirmación al visitante en esta spec. Con `onboarding@resend.dev` Resend no entrega a terceros, así que fallaría para cualquier visitante real. Va en una spec futura con dominio verificado.
- **No:** honeypot, CAPTCHA o rate limit. Decisión del usuario: solo validación en servidor. Riesgo de spam aceptado para el MVP.
- **Yes:** validación duplicada en cliente (UX del prototipo: shake) y servidor (única barrera de confianza).
- **Yes:** estado de error de envío con línea `[ERROR]` estilo terminal. El prototipo no lo define; sin él el usuario no sabría que el mensaje no salió, y mostrar el éxito falso sería peor.
- **Yes:** correo en texto plano. Suficiente para un buzón interno y evita mantener una plantilla.
- **Yes:** reutilizar `Reveal` de la SPEC 02 en vez del `useEffect` con `querySelectorAll` del prototipo; la página sigue siendo Server Component y solo el formulario es client.
- **Yes:** añadir al `globals.css` solo las reglas nuevas, como en las SPEC 01 y 02 (sin Tailwind, sin CSS aparte).

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `onboarding@resend.dev` solo entrega al correo de la cuenta Resend; poner otro `CONTACT_TO_EMAIL` falla | Documentar en `.env.example` que `CONTACT_TO_EMAIL` debe ser el correo de la cuenta mientras no haya dominio verificado. |
| Spam o abuso del formulario sin rate limit ni honeypot | Aceptado por decisión del usuario; límites de longitud en servidor acotan el tamaño. Spec futura si aparece abuso. |
| La API key se filtra al cliente o a logs | Variable sin prefijo `NEXT_PUBLIC_`, uso solo en `actions.ts`, sin `console.log` de la clave; criterio de aceptación verifica el bundle. |
| `.gitignore` ignora `.env*` y `.env.example` no se versiona | Paso 2 añade `!.env.example`. |
| Inyección de cabeceras o contenido por nombre/correo | El SDK recibe campos estructurados (no cabeceras armadas a mano); el correo se valida con patrón y el cuerpo es texto plano. |
| Reglas CSS duplicadas o en conflicto con `globals.css` (`.field`, `.kicker`, `.reveal`) | Paso 3: comparar selector a selector antes de pegar. |
| Cambios de API de Next.js 16 (`cacheComponents`, Server Actions) | El paso 1 obliga a leer `node_modules/next/dist/docs/` antes de codificar. |
| Diferencias visuales respecto al prototipo | El paso 10 compara con `arcade-vault-standalone.html`. |

---

## What is **not** in this spec

- Correo de confirmación al visitante y dominio verificado en Resend.
- Anti-spam más allá de la validación en servidor (honeypot, CAPTCHA, rate limit).
- Persistencia de mensajes o panel para leerlos.
- Plantillas de correo HTML.
- Tests automatizados.

Cada uno de estos puntos, si se aborda, va en su propia spec.

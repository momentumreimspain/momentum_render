# Objetivos de mejora y ampliación — Video Render (Gemini Veo)

Documento de referencia para priorizar trabajo técnico y de producto. Basado en revisión del código (React + Vite, Supabase Auth, Firebase Storage/Firestore, `@google/genai` con Veo 3.1).

---

## Resumen de la aplicación hoy

- **Flujo principal**: subir imagen → configurar cámara / prompt / resolución / música de fondo (solo en preview) → llamar a `generateVideos` → mostrar video → auto-guardado en Firebase si hay sesión Supabase.
- **Persistencia**: Firestore (`videoProjects`) + Storage (`users/{userId}/...`).
- **Autenticación en UI**: Supabase (`LoginModal`, `supabaseService`). **Firebase Auth** sigue exportado en `firebaseService.ts` pero **no encaja** con el flujo actual de `App.tsx` (posible legado o duplicación).
- **Clave Gemini**: inyectada en build vía `vite.config.ts` como `process.env.API_KEY` desde `GEMINI_API_KEY`; en entornos embebidos también existe integración con `window.aistudio`.

---

## Fortalezas actuales

- UX clara: presets de cámara, atajos de teclado, galería con filtros y modal de detalle.
- Preview de música sincronizada con el reproductor (`VideoPlayer`).
- Auto-guardado tras generar (sube imagen + video a Storage y crea documento en Firestore).
- Tema claro/oscuro y componentes UI coherentes.

---

## 1. Seguridad y cumplimiento (alta prioridad)

| Objetivo | Motivo |
|----------|--------|
| Endurecer reglas de **Firestore y Storage** | Si las reglas permiten lectura/escritura amplias, cualquier cliente con la config de Firebase puede exceder la intención “solo empleados”. La seguridad no puede depender solo del login en el front. |
| **API key de Gemini en el cliente** | La clave viaja en el bundle; conviene proxy en backend (Vercel Serverless / Cloud Function) o cuotas por usuario y rotación de claves. |
| Alinear **identidad Supabase con Firebase** | Opciones: Custom Token + Firebase Auth, o reglas basadas en metadata verificada; evitar que `userId` en Firestore sea solo “confianza del cliente”. |
| Revisión de **URLs de música externas** | Dependencia de terceros (Free Music Archive u otros); riesgo de rotura, CORS o términos de uso para uso corporativo. |

---

## 2. Arquitectura y calidad de código

| Objetivo | Detalle |
|----------|---------|
| Reducir **monolito en `App.tsx`** | Extraer hooks (`useVideoGeneration`, `useProjects`, `useKeyboardShortcuts`) y/o contexto para estado compartido. |
| Limpiar **código muerto o duplicado** | Ej.: `deleteVideoProject` importado en `App.tsx` y no usado; funciones de login Firebase en `firebaseService.ts` si el producto es 100% Supabase. |
| **Revocar `URL.createObjectURL`** | Tras generar video, revocar object URLs antiguos para evitar fugas de memoria en sesiones largas. |
| **Dependencias de `useEffect` (atajos)** | Los handlers de teclado pueden quedar desactualizados si las dependencias no incluyen las funciones actuales; considerar `useCallback` estable o registro con refs. |
| **Tests y lint** | `package.json` no incluye ESLint ni tests; añadir al menos lint en CI y tests críticos (p. ej. utilidades, construcción de prompts). |
| Alinear **`.env.example`** con la realidad | Incluir `GEMINI_API_KEY`, variables `VITE_SUPABASE_*` usadas por la app, además de Firebase. |

---

## 3. Integración con Veo / generación de video

| Objetivo | Detalle |
|----------|---------|
| Mapear **duración e intensidad** a la API | Hoy gran parte va al **texto del prompt**; confirmar en documentación del SDK si existen campos de `config` equivalentes para mayor consistencia. |
| **Aspect ratio** configurable | En `geminiService.ts` está fijado `16:9`; ofrecer 9:16 u otros si el negocio lo necesita (reels, stories). |
| **Modelos y fallback** | Parametrizar modelo (`veo-3.1-fast-generate-preview`) y contemplar fallback o mensajes claros si un modelo deja de estar en preview. |
| **Polling** | Intervalo fijo de 10s; valorar backoff, timeout máximo y UX de “cola” o tiempo estimado. |

---

## 4. Producto y UX (ampliación)

Ideas alineadas con el roadmap interno y huecos detectados en UI:

- **Compartir enlace público** (proyecto o video) con tokens firmados o páginas de solo lectura.
- **Borrar proyecto** desde galería o modal (Storage + Firestore + limpieza de archivos huérfanos).
- **Edición de metadatos** ya guardados sin recrear proyecto (flujo claro si solo cambian tags/descripción).
- **Cola / historial de generaciones** y reintentos cuando falle la API.
- **Procesado por lotes** (varias imágenes o carpeta).
- **Plantillas de prompt** y favoritos reutilizables.
- **Exportar** con música mezclada (hoy la música no forma parte del MP4 generado por Veo; requeriría post-procesado en servidor o cliente con ffmpeg.wasm, con implicaciones de rendimiento y licencias).
- Botones de **pantalla completa** en la tarjeta “Video Output” (actualmente parecen placeholders sin acción).
- Internacionalización (i18n) si hay usuarios multilingües.

---

## 5. Rendimiento y coste

- **Paginación o límites** en `getAllProjects` para no cargar toda la colección.
- **Miniaturas** explícitas (`thumbnailUrl` existe en el tipo pero conviene generarlas al guardar para la galería.
- Política de retención o archivado de vídeos en Storage.

---

## 6. Accesibilidad y consistencia

- Revisar etiquetas ARIA en controles custom, foco en modales y contraste en modo oscuro.
- Unificar textos en español/inglés en mensajes de error de `geminiService` (parte en inglés).

---

## Priorización sugerida (backlog corto)

1. Seguridad Firebase (reglas + vínculo real con identidad del usuario).
2. Proxy o backend para Gemini / gestión de claves.
3. Eliminar imports muertos; decidir si se borra Firebase Auth del servicio o se documenta un segundo modo de login.
4. Borrado de proyectos + limpieza en Storage.
5. Refactor incremental de `App.tsx` y corrección de atajos/dependencias.
6. Mejoras de producto: compartir, batch, aspect ratio, paginación de galería.

---

## Cómo usar este documento

- Marcar ítems con **Estado**: pendiente / en curso / hecho.
- Asignar **Impacto** (usuario / coste / riesgo) y **Esfuerzo** para ordenar sprints.
- Actualizar cuando cambien modelos de Veo, políticas de Google o el stack de despliegue.

*Última revisión del código: marzo 2025.*

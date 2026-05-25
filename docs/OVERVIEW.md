# videorender_gemini — Overview

## ¿Qué es?

Aplicación web para **generar vídeos a partir de imágenes usando Google Gemini Veo 3.1**. Sube una imagen (render 3D, foto de proyecto, etc.), configura movimiento de cámara, prompt y resolución, y genera un vídeo animado con IA. Incluye galería de proyectos guardados.

**Nombre interno:** Persuadis Life - Render Animator

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | **React 19** + TypeScript 5.8 |
| Build | **Vite 6** |
| IA/Vídeo | **Google Gemini** (@google/genai) — modelo Veo 3.1 fast |
| Auth | **Supabase Auth** (SSR) |
| Storage/DB | **Firebase** (Firestore + Storage) |
| Upload | react-dropzone |
| Origen | Google AI Studio (exportado) |

## Dependencias Clave

- `@google/genai` — SDK de Google Gemini para generación de vídeo (Veo 3.1)
- `firebase` — Firestore (proyectos guardados) + Storage (archivos)
- `@supabase/supabase-js` + `@supabase/ssr` — autenticación de usuarios
- `react-dropzone` — drag & drop de imágenes

## Funcionalidades

1. **Upload de imagen:** Drag & drop o selección de archivo
2. **Configuración de vídeo:** Resolución (720p/1080p), duración (4s/6s/8s), prompt descriptivo
3. **Movimiento de cámara:** 11 presets (static, pan, tilt, zoom, dolly, orbit, crane) con velocidad e intensidad
4. **Generación con Gemini Veo:** Envía imagen + prompt → polling del resultado → vídeo generado
5. **Galería de proyectos:** Guardado en Firestore, sidebar con historial
6. **Música de fondo:** 3 tracks predefinidos (ambient, corporativo, lounge)
7. **Login:** Autenticación via Supabase
8. **Tema claro/oscuro:** Toggle con persistencia
9. **Atajos de teclado:** Panel de ayuda
10. **Quick Actions:** Acciones rápidas contextuales

# videorender_gemini — Estado

## Estado General: 🟡 Funcional / Prototipo avanzado

Aplicación exportada desde Google AI Studio con personalizaciones significativas. Funcional pero con arquitectura monolítica (App.tsx ~760 líneas).

## Qué Funciona

- ✅ Upload de imágenes (drag & drop)
- ✅ Generación de vídeo con Gemini Veo 3.1
- ✅ 11 presets de cámara con velocidad e intensidad
- ✅ Resolución 720p/1080p, duración 4s/6s/8s
- ✅ Galería de proyectos (Firestore)
- ✅ Login con Supabase
- ✅ Storage en Firebase
- ✅ Tema claro/oscuro
- ✅ Atajos de teclado
- ✅ Música de fondo predefinida

## Notas

- ⚠️ **App.tsx monolítico:** ~760 líneas con toda la lógica de estado, efectos y rendering
- ⚠️ **Auth híbrida:** Supabase para auth + Firebase para datos — complejidad innecesaria
- ⚠️ **API key en process.env:** Gemini API key se pasa como variable de entorno (Vite la expone al cliente)
- ⚠️ **Origen AI Studio:** Exportado de Google AI Studio, puede tener dependencias del entorno AI Studio

## TODOs / Mejoras Posibles

- 📋 Refactorizar App.tsx en componentes más pequeños con custom hooks
- 📋 Unificar backend: migrar todo a Supabase O todo a Firebase (no ambos)
- 📋 Mover la llamada a Gemini a un backend/edge function (no exponer API key al cliente)
- 📋 Añadir más tracks de música / permitir upload custom
- 📋 Batch generation (múltiples renders a la vez)
- 📋 Preview de configuración de cámara antes de generar
- 📋 Historial de prompts usados
- 📋 Compartir vídeos generados (link público)
- 📋 Tests
- 📋 README necesita contenido propio (actualmente es el template de AI Studio)

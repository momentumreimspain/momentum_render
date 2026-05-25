# videorender_gemini — Arquitectura

## Estructura de Carpetas

```
videorender_gemini/
├── index.html                 # Entry point HTML
├── index.tsx                  # Entry point React
├── App.tsx                    # Componente principal (~760 líneas, toda la lógica)
├── types.ts                   # Tipos TypeScript (resolución, cámara, duración)
├── vite.config.ts             # Configuración Vite
├── tsconfig.json
├── package.json
├── .env.example               # Variables Firebase
├── config/
│   └── firebase.ts            # Inicialización Firebase
├── services/
│   ├── geminiService.ts       # Llamada a Gemini Veo 3.1 + polling
│   ├── firebaseService.ts     # CRUD Firestore + Storage
│   └── supabaseService.ts     # Auth Supabase
├── components/
│   ├── Header.tsx             # Header con theme toggle y user menu
│   ├── ImageUpload.tsx        # Drop zone para imágenes
│   ├── VideoPlayer.tsx        # Reproductor de vídeo generado
│   ├── VideoModal.tsx         # Modal de vídeo ampliado
│   ├── VideoConfigPreview.tsx # Preview de configuración
│   ├── CameraPresets.tsx      # Selector de movimientos de cámara
│   ├── GallerySidebar.tsx     # Sidebar con proyectos guardados
│   ├── ContextPanel.tsx       # Panel de contexto
│   ├── QuickActions.tsx       # Acciones rápidas
│   ├── LoginModal.tsx         # Modal de login
│   ├── Loader.tsx             # Spinner de carga
│   ├── Alert.tsx              # Alertas
│   ├── Toast.tsx              # Notificaciones toast
│   ├── KeyboardShortcutsHelp.tsx
│   ├── ThemeToggle.tsx
│   └── ui/                    # Primitivos (Button, Input, Textarea, Label, Select, Card)
├── hooks/
│   └── useTheme.ts            # Hook dark/light mode
├── lib/
│   └── supabase.ts            # Cliente Supabase
├── utils/
│   └── blob.ts                # Utilidad blob→base64
├── firestore.rules            # Reglas Firestore
├── storage.rules              # Reglas Storage
├── FIREBASE_SETUP.md          # Guía setup Firebase
├── DEPLOYMENT.md              # Guía deployment
└── CLAUDE.md                  # Instrucciones para Claude
```

## Flujo de Datos

### Generación de vídeo
1. Usuario sube imagen → `ImageUpload` → blob en estado
2. Configura prompt, cámara, resolución, duración
3. Click "Generar" → `geminiService.generateVideoFromImage()`
4. Envía imagen (base64) + prompt al modelo `veo-3.1-fast-generate-preview`
5. Polling cada 10s hasta completar (`pollOperation`)
6. Recibe video bytes → blob URL → `VideoPlayer`

### Persistencia
- **Firestore:** Guarda proyectos (VideoProject) con metadata
- **Firebase Storage:** Almacena archivos (imágenes, vídeos)
- **Supabase Auth:** Gestión de sesión de usuario

### Auth (híbrido)
- Login/logout via `supabaseService` (Supabase Auth)
- Datos y storage via `firebaseService` (Firebase)
- Arquitectura dual: Supabase para auth, Firebase para datos

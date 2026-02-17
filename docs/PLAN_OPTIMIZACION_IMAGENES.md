# Plan de Optimización de Imágenes - Carga Masiva

## Resumen Ejecutivo

| Aspecto | Estado Actual | Estado Propuesto |
|---------|--------------|------------------|
| **Compresión** | Ninguna | Compresión automática en navegador |
| **Redimensionado** | Ninguno | Máx 1920x1920px |
| **Formato** | JPG/PNG/WEBP original | Conversión a WebP |
| **Preview** | Después de subir | Antes de subir (local) |
| **Progreso** | Solo texto "Subiendo..." | Barra de progreso por imagen |
| **Tamaño esperado** | ~2-5MB por imagen | ~100-500KB por imagen (80-90% reducción) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUJO ACTUAL                               │
├─────────────────────────────────────────────────────────────────┤
│  Usuario selecciona  →  Envío directo  →  Vercel Blob Storage   │
│  imagen (5MB)           al servidor        (5MB almacenado)     │
└─────────────────────────────────────────────────────────────────┘

                              ↓ CAMBIO A ↓

┌─────────────────────────────────────────────────────────────────┐
│                      FLUJO OPTIMIZADO                           │
├─────────────────────────────────────────────────────────────────┤
│  Usuario       →  Compresión  →  Preview  →  Upload  →  Vercel  │
│  selecciona       en browser     local      servidor    Blob    │
│  imagen (5MB)     (~300KB)      instantáneo  rápido    (300KB)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementación

### Fase 1: Dependencias y Utilidades (2-3 horas)

| Tarea | Descripción | Archivo |
|-------|-------------|---------|
| 1.1 | Instalar `browser-image-compression` | `package.json` |
| 1.2 | Crear utilidad de configuración | `lib/image-optimization.ts` |
| 1.3 | Crear hook `useImageOptimizer` | `hooks/useImageOptimizer.ts` |

**Configuración:**
```typescript
export const IMAGE_CONFIG = {
  maxSizeMB: 1,           // Máximo 1MB después de comprimir
  maxWidthOrHeight: 1920, // Máximo 1920px en cualquier dimensión
  useWebWorker: true,     // Usar Web Worker para no bloquear UI
  fileType: 'image/webp', // Convertir a WebP
  initialQuality: 0.8,    // Calidad inicial 80%
}
```

---

### Fase 2: Integración en ImageDropzone (3-4 horas)

| Cambio | Descripción |
|--------|-------------|
| Integrar hook | Usar `useImageOptimizer` |
| Preview local | Mostrar preview ANTES de subir |
| Barra de progreso | Progreso por imagen individual |
| Estadísticas | Mostrar ahorro de tamaño |

**Nuevo flujo visual:**
```
1. Usuario arrastra imágenes
2. Muestra "Optimizando..." con barra de progreso
3. Muestra previews locales con badge de ahorro ("↓85%")
4. Usuario confirma o elimina imágenes
5. Click en "Subir" → sube las versiones optimizadas
6. Muestra progreso de upload
7. Completo ✓
```

---

### Fase 3: Mejoras de UX (2-3 horas)

| Mejora | Descripción |
|--------|-------------|
| **Barra de progreso global** | Muestra progreso total de todas las imágenes |
| **Indicador de ahorro** | Muestra "Ahorraste 45MB en esta carga" |
| **Preview instantáneo** | Thumbnails antes de subir |
| **Reintento automático** | Si falla una imagen, permite reintentar |

---

## Estructura de Archivos

```
lib/
├── image-optimization.ts      # ✨ NUEVO - Configuración y utilidades
├── blob-storage.ts            # Existente (sin cambios)
└── actions/
    └── admin-carga-masiva.ts  # Existente (sin cambios mayores)

hooks/
└── useImageOptimizer.ts       # ✨ NUEVO - Hook de optimización

components/
└── carga-masiva/
    └── ImageDropzone.tsx      # 📝 MODIFICAR - Integrar optimización
```

---

## Cronograma

| Día | Tareas | Horas |
|-----|--------|-------|
| **Día 1 - Mañana** | Fase 1: Instalar dependencias, crear archivos base | 2-3h |
| **Día 1 - Tarde** | Fase 2: Implementar hook e integrar | 3-4h |
| **Día 2 - Mañana** | Fase 3: Mejoras UX, testing, ajustes | 2-3h |

**Total estimado: 10-14 horas**

---

## Beneficios Esperados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tamaño promedio por imagen | 2-5 MB | 100-500 KB | **80-95%** |
| Tiempo de upload (10 imgs) | 30-60s | 5-10s | **80%** |
| Almacenamiento Vercel Blob | 100% | 10-20% | **80-90%** |
| Preview de imágenes | Después de upload | Instantáneo | **100%** |

---

## Dependencias Requeridas

```bash
npm install browser-image-compression
```

---

## Consideraciones Técnicas

### Compatibilidad
- `browser-image-compression` soporta todos los navegadores modernos
- Usa Web Workers (no bloquea la UI)
- Fallback automático si Web Worker no está disponible

### Manejo de errores
- Si una imagen no se puede comprimir, se usa la original
- Si el archivo es muy pequeño (<100KB), no se comprime
- Validación de imágenes corruptas antes de procesar

### Nombres de archivo
- Se mantiene el nombre original para el matching con Excel
- La extensión interna puede cambiar a `.webp`

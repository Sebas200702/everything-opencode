---
name: web-performance
description: Auditar y mejorar el rendimiento web: Core Web Vitals (LCP, INP, CLS), bundle size, lazy loading, caching e imágenes. Usar al optimizar páginas, componentes o el pipeline de carga de una app web.
---

# Web Performance

## When to Use

- El usuario pide mejorar velocidad, Core Web Vitals, TTI, o el "peso" de la página
- Se discuten imágenes, fonts, lazy loading, caching, code splitting o bundle size
- Hay informes de Lighthouse/PageSpeed/CrUX con métricas rojas que corregir
- Al revisar un PR que toca assets, render o fetching de datos en el cliente

## Workflow

1. **Mide antes de tocar.** Ejecuta Lighthouse (preset mobile) o consulta CrUX del proyecto. Registra LCP, INP, CLS y el tamaño/peso del bundle actual con `bash` (p.ej. resume del build). Sin baseline no hay progreso verificable.
2. **Encuentra los culpables.** Usa `grep` sobre el código de render/imports: busca `import` de librerías grandes, `<img>` sin `loading`, fuentes cargadas inline, y efectos secundarios en el montaje. Usa `glob` para mapear assets estáticos pesados (`**/*.{png,jpg,webp,woff2}`).
3. **Ata la cadena crítica en orden:**
   - **LCP**: el recurso que pinta el contenido visible debe cargarse pronto y con prioridad (`fetchpriority="high"`), sin ser bloqueado por scripts.
   - **INP**: elimina work largos en el hilo principal (parsing, listeners pesados, efectos en scroll). Refactoriza y delega off-main-thread si aplica.
   - **CLS**: reserva espacio (`aspect-ratio`, `min-height`) para imágenes, embeds y banners que inyectan layout al llegar.
4. **Reduce el bundle.** Code splitting por ruta, lazy load de componentes no críticos (`import()` dinámico), y revisa dependencias duplicadas. Elimina lo que no se usa; tree-shaking requiere imports explícitos.
5. **Optimiza imágenes y fuentes.** WebP/AVIF, `srcset` con `sizes`, `loading="lazy"` + `decoding="async"` para las que no son LCP, y `display=swap` + `preload` (solo la fuente crítica) con subsetting.
6. **Cachea lo estático.** Cabeceras `Cache-Control` para assets con hash, `ETag` para respuestas dinámicas, y `stale-while-revalidate` donde el dato se tolera viejo. En SPA/SSR, cachea también HTML fragmentado cuando corresponda.
7. **Verifica el impacto.** Re-mide con Lighthouse/CrUX y compara con el baseline. Reporta el delta de cada métrica tocada. Si no mejoró, vuelve al paso 2 — no cierres con "mejoró un poco" sin evidencia.

## Checklist

- [ ] Baseline de LCP, INP, CLS medido antes de empezar (Lighthouse o CrUX)
- [ ] Imagen LCP con `fetchpriority="high"` y sin lazy
- [ ] Resto de imágenes con `loading="lazy"`, `decoding="async"`, `srcset`/`sizes` y formato moderno
- [ ] `aspect-ratio`/reserva de espacio para contenidos que llegan tarde (CLS ≈ 0)
- [ ] Code splitting aplicado: módulos grandes no se cargan en el import inicial
- [ ] Fuentes con `font-display: swap`, subsetting y `preload` solo de la crítica
- [ ] `Cache-Control` correcto por tipo de asset; contenido dinámico con `ETag`/revalidación
- [ ] Sin listeners/efectos pesados en scroll/resize; work largo fuera del main thread
- [ ] Métricas re-medidas y comparadas con el baseline (delta documentado)

## Common Pitfalls / Anti-patterns

- **Optimizar sin medir**: cambias cosas "que suenan bien" y rompes la UX sin saber qué era el problema.
- **Lazy load de todo**: la imagen/párrafo que es el LCP debe ser eager con prioridad; lazy-loadearla destruye la métrica.
- **Fonts bloqueantes**: cargar todo el webfont antes de pintar texto retrasa LCP y causa layout shift; usa `swap`.
- **Bundles monoliticos**: una sola lib de UI cargada al inicio aunque una ruta use 3 componentes.
- **CLS por contenido tardío**: banners, anuncios o tablas que cambian el layout sin espacio reservado.
- **Cache agresivo sin hash**: servir `app.js` con cache largo aun cuando el contenido cambió rompe deploys; hashea los nombres.
- **Imágenes gigantes en móvil**: una imagen de 2000px servida a 400px de viewport desperdicia ancho de banda y ralentiza LCP.
- **Efectos en el main thread**: animaciones `transform + opacity` ok; animar `width`/`height`/`top` obliga a layout y pinta barato de CPU.
- **`preload` de todo**: precargar recursos que no son críticos compite por ancho de banda con el LCP real; `preload` solo para el recurso que pinta el primer contenido.
- **Concatenar/inyectar JS "porque es un archivo menos"**: un bundle + CSS grande único bloquea el render; mejor varios chunks pequeños y cacheables que uno gigante.
- **Ignorar la caché del navegador en dev**: triangular `Cache-Control` en la API para "que no se quede viejo" y luego sorprenderse con clientes usando datos stale; usa revalidación explícita (`ETag`, `Last-Modified`) en vez de `no-cache` global.

```html
<!-- Imagen crítica (LCP): eager y prioritaria -->
<img src="/hero.avif" srcset="/hero-800.avif 800w, /hero-1600.avif 1600w"
     sizes="(max-width: 768px) 100vw, 50vw" fetchpriority="high" />

<!-- Imagen secundaria: lazy y asíncrona -->
<img src="/galeria.webp" loading="lazy" decoding="async"
     width="640" height="427" alt="Galería" />
```
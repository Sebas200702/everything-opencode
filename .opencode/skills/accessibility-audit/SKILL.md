---
name: accessibility-audit
description: Auditar y corregir accesibilidad web siguiendo WCAG 2.2: ARIA, contraste, teclado, foco, lectores de pantalla y HTML semántico. Usar cuando se pida "auditoría de accesibilidad", "hacer accesible", "WCAG" o "a11y".
---

# Accessibility Audit

## When to Use

- El usuario pide auditar o corregir accesibilidad ("a11y", "WCAG", "hacer accesible")
- Se crean o revisan componentes con interacción, formularios, modales, menús o tablas
- Hay reportes de axe/Lighthouse/Lighthouse CI con violaciones que resolver
- Antes de publicar una página nueva con contenido interactivo

## Workflow

1. **Barrido automatizado.** Ejecuta axe (DevTools o `axe-core`) sobre las vistas clave. Usa `grep` sobre los componentes afectados para localizar los patrones denunciados (roles, `aria-`, `tabindex`, inputs sin label). El barrido encuentra ~30% de los problemas; lo manual encuentra el resto.
2. **Revisa el HTML semántico con `read`.** Antes de parchear con ARIA, comprueba si un elemento nativo ya aporta el rol/estado (botón, checkbox, dialog, nav). Si el nativo funciona, no uses ARIA: ARIA solo repara cuando lo nativo no alcanza.
3. **Auditoría de teclado.** Recorre la página solo con Tab/Shift+Tab y Enter/Escape desde el código: verifica orden lógico de foco, foco visible (no `outline: none` sin reemplazo), y ausencia de trampas de foco.
4. **Verifica foco y diálogos.** Con `grep` busca modales/paneles y confirma: foco se mueve dentro al abrir, se traba en el diálogo (focus trap) y vuelve al gatillo al cerrar. Sin `aria-modal` la pantalla de detrás sigue siendo navegable por SR.
5. **Revisa ARIA y nombres accesibles.** Cada control interactivo necesita un nombre (label, `aria-label`, `aria-labelledby` o texto visible). Ningún `aria-hidden="true"` debe envolver foco ni contenido legible.
6. **Contraste y targets.** Verifica contraste ≥ 4.5:1 (texto normal) y ≥ 3:1 (grande/UI y gráficos) — WCAG 2.2 nivel AA. Estados (hover/focus) distinguibles; targets táctiles ≥ 24×24px (2.2) y separados.
7. **Prueba con lector de pantalla (representativo).** Recorre las rutas críticas: anuncios de estado (`aria-live`), errores de formulario anunciados, landmarks navegables. Sin SR disponible, verifica con el Árbol de Accesibilidad de DevTools.
8. **Cierra el ciclo.** Re-ejecuta axe y confirma que las violaciones originales desaparecieron y no aparecieron regresiones en otras vistas.

## Checklist

- [ ] Barrido axe sin violaciones críticas/serias en las rutas principales
- [ ] HTML semántico usado antes que ARIA; ARIA solo donde falta soporte nativo
- [ ] Navegación 100% operable con teclado; foco visible en todos los estados
- [ ] Modales: focus trap, apertura/cierre con foco gestionado y `aria-modal`
- [ ] Todo control interactivo tiene nombre accesible (label, `aria-label` o texto)
- [ ] Contraste AA (4.5:1 texto, 3:1 UI/grande); targets ≥ 24×24 px bien separados
- [ ] Mensajes de estado/error anunciados con `aria-live` o `role="status"/"alert"`
- [ ] Imágenes decorativas con `alt=""`; informativas con `alt` descriptivo
- [ ] `aria-hidden` no oculta elementos enfocables ni contenido relevante
- [ ] Movimiento/animation respeta `prefers-reduced-motion` y tiene control de pausa
- [ ] Re-verificación con axe tras los cambios (sin regresiones)

## Common Pitfalls / Anti-patterns

- **ARIA de adorno**: `role="button"` en un `div` con listener de click pierde el foco nativo, el Enter/Espacio y el nombre; usa `<button>`.
- **`aria-hidden` sobre el foco o el contenido**: un elemento enfocable oculto a SR queda huérfano; un modal "oculto" por `aria-hidden` en el padre sigue legible según el árbol.
- **Labels rotos o vacíos**: `placeholder` no es label; inputs sin `<label for>`/`aria-label` no tienen nombre.
- **`outline: none` sin alternativa**: eliminas la guía visible del teclado; provee un estilo de foco propio.
- **Contraste solo en texto**: bordes, iconos de estado y placeholders también exigen 3:1; el texto gris claro sobre gris es el clásico fallo.
- **Tabla de datos como `div`**: pierdes la semántica de fila/columna y la navegación del SR; usa `<table>`, o roles `row`/`columnheader` explícitos si no queda otra.
- **Errores de formulario solo visuales**: texto rojo sin anuncio del SR ni `aria-describedby` deja a los usuarios de lector sin saber qué falló.
- **Orden de foco distinto al visual**: con `tabindex` positivo o reordenando DOM con CSS pierdes la coherencia entre lo que se ve y lo que el teclado recorre.
- **Contenido animado/carrusel sin control**: autoplay perpetuo sin pausa ni alternativa viola WCAG (movimiento, parpadeo); reduce movimiento (`prefers-reduced-motion`) y ofrece controles.
- **Widgets complejos (combo box, tabs, tree) con roles inventados**: perder los estados y la interacción esperados del patrón (`aria-expanded`, `aria-selected`, flechas); reusa el patrón ARIA del WAI-ARIA Authoring Practices.
- **`alt` duplicado como "imagen de..."**: para imágenes informativas describe el contenido útil, no el formato del archivo; las decorativas van con `alt=""` para silenciarlas.

```html
<!-- Patrón correcto: control nativo + label + error anunciado -->
<div>
  <label for="email">Correo</label>
  <input id="email" type="email" aria-describedby="email-error" />
  <p id="email-error" role="alert">Formato de correo inválido</p>
</div>
```
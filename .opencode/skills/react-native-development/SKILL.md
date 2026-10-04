---
name: react-native-development
description: Desarrollar y depurar apps React Native: componentes, state management, navegación, formularios, performance (FlatList, memo) y plataformas iOS/Android. Usar para cualquier tarea RN en el repo.
---

# React Native Development

## When to Use

- El usuario pide crear, revisar o depurar código React Native (`*.tsx` con `react-native`, `App.tsx`, navegación, `FlatList`)
- Se discuten estado, navegación (React Navigation/Expo Router), formularios o performance en dispositivos
- Hay reportes de jank, renders lentos, memory leaks o crash en una pantalla
- Cualquier tarea en una app Expo/RN del workspace

## Workflow

1. **Contexto del proyecto.** Lee `package.json` (¿Expo o bare RN? ¿React Navigation o Expo Router? ¿Versiones de RN/React?) con `read` y explora la estructura con `glob` (`**/*.tsx`, `**/navigation/**`). Confirma en qué plataforma corre el problema.
2. **Entiende la pantalla antes de tocar.** Usa `grep` para rastrear el estado que consume la pantalla (hooks, stores) y sus renders. En RN el ciclo render → re-render es costoso en dispositivo: identifica dónde se dispara.
3. **Diseño de componentes.** Componentes puros y pequeños; lógica en hooks (`use-*`); tipos en archivos `-types.ts`. Un componente = una responsabilidad visual. Usa estilos via StyleSheet (o NativeWind si el repo lo usa).
4. **Estado con criterio.** Estado local con `useState`/`useReducer`; estado global solo cuando varias pantallas lo comparten (Zustand/Redux según el repo). Server state: react-query/`useSWR` en vez de duplicarlo en stores. Evita re-render en cadena con props object literales.
5. **Navegación correcta.** `navigation.navigate` para ir, `goBack` para volver, y cuidado con `replace`/reset en flujos post-login (evita apilar pantallas). Pasa datos entre pantallas por parámetros tipados, no por estado global "de relleno".
6. **Formularios.** Librería del repo (react-hook-form o Formik) + validación imperativa en `onSubmit`. Evita setState por keystroke en el estado global: renderea por teclado toda la pantalla.
7. **Performance.** Listas largas → `FlatList` con `keyExtractor`, `getItemLayout` y `memo`. `React.memo` en filas; ninguna función nueva inline por render (`useCallback`). Evita `renderItem` creando closures nuevos.
8. **Debug y cierre.** Ejecuta el linter y `tsc` del repo vía `bash`. Verifica que el cambio no rompe la otra plataforma (rutas de assets, APIs solo-iOS/Android). Revisa memoria: listeners suscritos deben limpiarse.

## Checklist

- [ ] Componentes divididos; lógica en hooks; tipos en `-types.ts`
- [ ] Estado global solo para lo compartido; server state en cache (react-query/SWR)
- [ ] Listas con `FlatList` + `keyExtractor` estable y filas `memo`izadas
- [ ] Sin object literals/funciones nuevas inline que rompan el memo
- [ ] Navegación tipada; sin stacks duplicados tras login
- [ ] Formularios con la librería del repo; sin setState global por tecleo
- [ ] Fetches con abort/limpieza en `useEffect` (sin memory leaks al navegar)
- [ ] Lint + `tsc` pasan; verificado en ambas plataformas (sin APIs de una sola)
- [ ] Estilos via StyleSheet; sin inline strings de colores repetidos

## Common Pitfalls / Anti-patterns

- **Renders de toda la pantalla por cada media tecla**: el estado del input en el store global re-rendera la lista entera; mantén el keystroke local.
- **`ScrollView` con 10k filas**: bloquea el hilo JS; usa `FlatList` que virtualiza.
- **Closures en `renderItem`**: cada reporte nuevo de fila descarta el memo; extrae el renderer fuera o usa `useCallback` con deps estables.
- **Navegación por "capa"**: `navigation.navigate('Login')` apilando pantallas viejas; usa `reset`/`replace` en flujos de autenticación para no poder volver atrás.
- **Ignorar el `keyExtractor` correcto**: índices numéricos rompen el estado de la fila al reordenar; usa ids estables.
- **Estado duplicado servidor vs cliente**: datos de API copiados a un store global se desincronizan y re-renderan; sillón con react-query.
- **Estilos/externos solo-iOS o solo-Android sin protegerse**: `UIPanGestureRecognizer` o rutas de assets de una plataforma crashean en la otra; aísla con `Platform.select`.
- **Listeners sin limpiar**: `AppState`, `NetInfo`, sockets o listeners de navegación colgados producen memory leaks y callbacks sobre componentes desmontados.
- **Depurando en simulador y no en device**: problemas de memoria/perf solo aparecen en device real (JS jank, imágenes gigantes).

```tsx
// Lista performante: fila memoizada + keyExtractor estable
const Fila = memo(({ item }: { item: Usuario }) => (
  <Text>{item.nombre}</Text>
))

<FlatList
  data={usuarios}
  keyExtractor={(u) => u.id}
  renderItem={({ item }) => <Fila item={item} />}
  getItemLayout={(_, i) => ({ length: 56, offset: 56 * i, index: i })}
/>
```
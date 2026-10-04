---
name: go-development
description: Escribir, revisar o refactorizar código Go con goroutines/channels, manejo explícito de errores, interfaces, go mod y testing. Para cualquier tarea de desarrollo Go de backend/CLI/servicios.
---

# Go Development

## When to Use

- El usuario pide crear, revisar o depurar código Go (`*.go`, `go.mod`)
- Se discuten concurrencia (goroutines, channels), interfaces o manejo de errores
- Se evalúa performance, `go vet` / `go test` o el race detector
- Cualquier tarea en un repo Go, desde un CLI hasta un servicio HTTP

## Workflow

1. **Contexto del módulo.** Lee `go.mod` (nombre del módulo, versión de Go, dependencias) con `read`. Si no existe, inicializa con `go mod init <ruta>` vía `bash`. Confirma la versión de Go con `go version`.
2. **Explora antes de editar.** Usa `glob` con `**/*.go` para mapear el paquete y `grep` para encontrar usos de la función/símbolo que vas a tocar. Entiende la convención de carpetas del repo (`internal/`, `pkg/`, `cmd/`).
3. **Estructura el código.** Un archivo = una responsabilidad. Nombres cortos y descriptivos. `cmd/<bin>/main.go` solo llama; la lógica vive en paquetes.
4. **Concurrencia con disciplina.** Usa goroutines + channels cuando haya trabajo paralelo real, y siempre con `sync.WaitGroup`/`errgroup` para coordinar. Evita variables compartidas: pasa datos por canales o por valor.
5. **Manejo de errores explícito.** Cada operación que falla retorna `error` y se revisa inmediatamente. Usa `fmt.Errorf("contexto: %w", err)` para envolver causas. Define errores centinela o tipos de error cuando el caller deba distinguir casos.
6. **Interfaces definidas por el consumidor.** Declara interfaces pequeñas donde se usan (1–3 métodos), no donde se implementan. `io.Reader` es el modelo a seguir.
7. **Testing.** Escribe tests con `testing` table-driven. Cubre el happy path y los errores. Correlo con `go test ./...`.
8. **Verificación final.** Ejecuta `go vet ./...`, `go test -race ./...` (clave con concurrencia) y `gofmt -l .` para confirmar formato. Cierra solo cuando todo pase limpio.

## Checklist

- [ ] `go.mod` presente y con la versión de Go correcta
- [ ] Cada `error` se comprueba de inmediato; ningún `_ = fn()` que trague fallos
- [ ] Todos los errores propagados llevan contexto (`%w`)
- [ ] Goroutines coordinadas con `WaitGroup`/`errgroup`; sin fugas de goroutine
- [ ] Interfaces pequeñas y declaradas cerca del consumidor
- [ ] Tests table-driven para entradas válidas e inválidas
- [ ] `go vet ./...` y `go test -race ./...` pasan sin fallos
- [ ] `gofmt` aplicado (sin diffs de formato)

## Common Pitfalls / Anti-patterns

- **`nil` en slices/maps compartidos**: una escritura concurrente a un `map` panica; usa `sync.Mutex`, `sync.RWMutex` o canales.
- **Goroutine leak**: goroutine que espera en un canal que nadie cierra. Usa context con timeout y `select` con `ctx.Done()`.
- **Indexar y asignar al mismo slice desde varias goroutines**: carrera clásica; el race detector (`go test -race`) la pilla — ejecútalo siempre.
- **Ignorar el context**: funciones bloqueantes deben aceptar `context.Context` para cancelar limpiamente (timeout, shutdown).
- **Recibir dos veces de un canal cerrado**: leer de un canal cerrado devuelve el zero value; usa el patrón `v, ok := <-ch` para distinguir.
- **`go.mod` con dependencias no usadas**: `go mod tidy` antes de commitear.
- **Over-engineering con interfaces**: una interface con 10 métodos es un contrato rígido; culpa esconde la falta de diseño.
- **Panics para errores**: los panics son para bugs irreparables, no para validación de input.

```go
// Concurrencia segura: trabajadores sobre un canal de trabajo
func procesar(ctx context.Context, trabajos <-chan int, n int) error {
	var wg sync.WaitGroup
	errs := make(chan error, n)
	for range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range trabajos {
				if err := hacerTrabajo(ctx, j); err != nil {
					errs <- fmt.Errorf("trabajo %d: %w", j, err)
				}
			}
		}()
	}
	wg.Wait()
	close(errs)
	return <-errs // primer error (simplificado)
}
```
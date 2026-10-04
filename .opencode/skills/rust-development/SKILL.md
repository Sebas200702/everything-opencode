---
name: rust-development
description: Escribir, revisar o refactorizar código Rust con ownership/borrowing, Result/Option, clippy, cargo y testing. Para cualquier tarea de desarrollo Rust en el repo.
---

# Rust Development

## When to Use

- El usuario pide crear, revisar o depurar código Rust (`*.rs`, `Cargo.toml`)
- Se discuten ownership, borrowing, lifetimes, `Result`/`Option` o trait objects
- Se evalúa performance del código o se ejecutan `cargo build` / `cargo test` / `cargo clippy`
- Cualquier tarea en un crate del workspace

## Workflow

1. **Lee el crate.** Abre `Cargo.toml` (edición, dependencias, targets) con `read` y localiza los módulos con `glob` (`**/*.rs`). Entiende si es un workspace multi-crate.
2. **Comprende el flujo de datos antes de editar.** Usa `grep` para rastrear cómo se mueven las referencias (quién tiene el ownership del valor, quién lo presta). En Rust, cambiar la "forma" de un valor afecta a todos sus usos.
3. **Modela con el sistema de tipos.** Representa estados inválidos imposibles: `enum` en vez de booleans ambiguos, `Option<T>` para presencia opcional, `Result<T, E>` para fallos recuperables. Evita strings mágicos.
4. **Presta antes de mover.** Por defecto usa `&T`/`&mut T` en los parámetros; solo mueve (`T`) cuando el callee deba ser dueño (almacenar, convertir, vender tipos).
5. **Manejo de errores idiomático.** Usa `?` para propagar, define un tipo `Error` propio con `thiserror` (o un wrapper con `From`), y no conviertas en `String` los errores en cada capa.
6. **Compila, luego prueba.** Corre `cargo build` para iterar rápido, `cargo test` para la lógica y `cargo clippy -- -D warnings` para calidad antes de terminar. `cargo fmt` para el formato.
7. **Performance consciente.** Solo optimiza donde haya evidencia (perfil de ejecución); el `0-cost abstraction` no justifica escribir código ilegible a priori.

## Checklist

- [ ] `Cargo.toml` correcto (edición, dependencias) y sin warnings de compilación
- [ ] `Result`/`Option` usados para fallos y opcionalidad; sin `unwrap`/`expect` en código de producción
- [ ] No hay `unsafe` sin `// SAFETY:` explicando la invariante
- [ ] Ownership claro: préstamos (`&`) antes que movimientos; sin clonar por pereza
- [ ] Lifetimes implícitas cuando bastan; sin `'static` de relleno
- [ ] Errores con contexto (`thiserror`/`anyhow` según la capa) y propagados con `?`
- [ ] `cargo test` y `cargo clippy -- -D warnings` pasan sin fallos
- [ ] `cargo fmt` aplicado

## Common Pitfalls / Anti-patterns

- **`unwrap()` en producción**: panica en el peor momento; si el valor "siempre existe", aún mejor devolver `Result` o usar `Option::ok_or`.
- **Clonar para evitar el borrow checker**: señal de diseño apresurado; reconsidera las referencias o el split de `&mut` (p.ej. `split_at_mut`, iteradores con índices).
- **Lifetimes explícitas de sobra**: `fn f<'a>(x: &'a str) -> &'a str` correcto, pero la mayoría se eliden; añádelas solo cuando el compilador lo exija para desambiguar.
- **Trait objects innecesarios**: `Box<dyn Trait>` cuando un genérico con `impl Trait`/monomorfización es más rápido y estático. Trait objects solo cuando el polimorfismo dinámico es real.
- **`.clone()` costoso en hot path**: clona `String`/`Vec` en loops internos sin motivo; usa `&str`/slices.
- **`Vec` cuando sobra `Box<str>`/`String`**: el ownership debe reflejar el uso real; los containers gigantes con overhead se pagan por préstamo.
- **Ignorar `clippy`**: sus lints capturan bugs reales (useless conversion, redundant clone, manual `unwrap_or`); corrígelos en vez de `#[allow(...)]` a ciegas.
- **Mutable global (`static mut`) o hilos con `unsafe` sin motivo**: usa `Mutex`, `RwLock` o `OnceLock`; el código single-threaded no es excusa.
- **`Arc`/`Mutex` por reflejo**: envolver todo en `Arc<Mutex<...>>` "por si acaso" vuelve el código ilegible; usa préstamos y tipos simples hasta que la concurrencia se demuestre necesaria.
- **`unwrap_or` que evalúa siempre el default**: `unwrap_or(expr_costosa)` ejecuta la expresión aunque haya valor; usa `unwrap_or_else` (cerrado lazy) para defaults con costo.
- **Lifetimes en el tipo equivocado**: `struct S<'a> { data: &'a str }` obliga a anotar cada uso; si el dato es propio, guarda `String` y evita la lifetime reñida.

```rust
// Modela el estado válido en el tipo: imposible construir un "usuario sin email"
pub struct Usuario {
    pub id: u64,
    pub nombre: String,
    pub email: Option<String>, // presencia opcional explícita
}

pub fn buscar(nombre: &str, usuarios: &[Usuario]) -> Option<&Usuario> {
    usuarios.iter().find(|u| u.nombre == nombre)
}
```
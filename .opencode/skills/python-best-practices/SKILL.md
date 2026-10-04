---
name: python-best-practices
description: Escribir, revisar o refactorizar código Python con estilo PEP 8, typing, venvs/uv, testing con pytest y manejo de errores. No usar para data science profundo (pandas/numpy a gran escala), eso tiene su propia skill.
---

# Python Best Practices

## When to Use

- El usuario pide crear, revisar o refactorizar código Python (scripts, APIs, CLI, servicios)
- Se discuten tipos, dependencias, entornos virtuales o testing con `pytest`
- Se evalúa performance de código Python de propósito general
- NO aplicar si el trabajo es data science profundo (ETL masivo, pipelines de ML): usa la skill específica de data science

## Workflow

1. **Entorno y dependencias.** Antes de tocar código, confirma el gestor: prefiere `uv` (resolución rápida) o `venv/pip` clásico. Nunca instales dependencias globales con `pip install` sin preguntar. Usa `bash` para ver el contenido de `pyproject.toml`/`requirements.txt` y detecta qué gestor usa el repo.
2. **Lee el código relevante.** Usa `glob` para localizar los módulos implicados y `read` para entender la estructura antes de editar. No adivines: lee.
3. **Respeta PEP 8 y la guía del repo.** Sigue `ruff`/`black`/`flake8` si están configurados (`bash` con `ruff check .`). Respeta el estilo existente del archivo que editas.
4. **Añade tipos.** Todo código nuevo lleva anotaciones de tipo. Usa `typing` moderno (`list[str]` en vez de `List[str]`, `X | None` en vez de `Optional[X]`) salvo que el repo tenga otra convención (p.ej. Python 3.9).
5. **Diseña para fails fast.** Valida entradas al inicio, define excepciones claras y no silencies errores con `except Exception: pass`.
6. **Escribe y ejecuta pruebas.** Cada cambio lógico lleva su test con `pytest`. Ejecuta solo el test del módulo que tocas para feedback rápido, y la suite completa antes de terminar.
7. **Verifica.** Corre lint + tests + (si aplica) `mypy`/`pyright` en modo estricto. Cierra el bucle solo cuando todo pasa.

## Checklist

- [ ] Usé `uv` o activé el venv del repo antes de instalar/ejecutar
- [ ] Código formateado según PEP 8 / config del repo (sin errores de `ruff check`)
- [ ] Funciones y métodos con anotaciones de tipo (`def f(x: int) -> str:`)
- [ ] No hay `except:` desnudo ni excepciones silenciadas
- [ ] Cada función hace una sola cosa y tiene nombre descriptivo
- [ ] Pruebas con `pytest` para la lógica nueva y los casos borde
- [ ] Corro `python -m pytest` y el lint completo antes de abrir PR
- [ ] No dejé print de debug; uso `logging` cuando hace falta trazar
- [ ] Funciones cortas (una responsabilidad); sin efectos escondidos ni mutación de args
- [ ] Importación de módulos explícita y en el orden estándar (stdlib, terceros, propios)

## Common Pitfalls / Anti-patterns

- **Instalar al global**: siempre venv o `uv`; `pip install` global rompe entornos compartidos.
- **Función larga y multi-responsabilidad**: dividir; una función = una tarea (buen límite: legible en una pantalla).
- **`except Exception: pass`**: oculta errores de producción; registra con `logging.exception` o deja propagar.
- **Mutables como default**: `def f(items=[])` es un bug clásico; usa `def f(items: list[str] | None = None)` y crea la lista dentro.
- **Comparar con `is` en vez de `==`**: `==` para valores, `is` solo para `None`/singleton.
- **Async sin entender el loop**: bloqueos con `time.sleep` dentro de `async`; usa `asyncio.sleep` y no mezcles sin `asyncio.run`.
- **Import de módulos grandes por `*`**: rompe legibilidad y lint; importa explícito.
- **Ignorar tu propio typing**: si `mypy` falla, corrígelo; no añadas `# type: ignore` sin justificar por qué.
- **Mezclar sync y async sin cuidar el loop**: `time.sleep` bloquea el event loop en corrutinas; usa `asyncio.sleep` y lanza el loop una sola vez con `asyncio.run`.
- **Dependencias flotantes sin pin**: `requirements.txt` sin versiones acopladas rompe builds a futuro; congela dependencias o usa `uv lock`/`poetry.lock`.
- **Strings por concatenación en bucles**: `s += x` en loops grandes es cuadrático; acumula en `list` y usa `''.join(...)`.

```python
# Ejemplo de base sólida
from collections.abc import Sequence


def promedio(numeros: Sequence[float]) -> float:
    """Calcula el promedio, o lanza ValueError si la lista está vacía."""
    if not numeros:
        raise ValueError("no se puede promediar una secuencia vacía")
    return sum(numeros) / len(numeros)
```
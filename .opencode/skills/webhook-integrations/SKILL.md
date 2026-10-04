---
name: webhook-integrations
description: Usa esta skill al enviar o recibir webhooks: firmas HMAC, retries con backoff exponencial, idempotencia, entrega de eventos, replay, timeouts y dead-letter queues.
---

# Integraciones con Webhooks

Cómo enviar y recibir webhooks de forma robusta: integridad (firmas), entrega confiable (retries) y procesamiento duplicable (idempotencia).

## When to Use

- Tu app notifica a terceros de eventos (pago, registro, cambio de estado) vía webhook
- Integras un webhook entrante de un proveedor (Stripe, GitHub, Twilio, etc.)
- Hay entregas perdidas o duplicadas y hay que estabilizar el pipeline
- Se define el contrato de eventos que otro equipo consumirá

## Workflow

1. **Define el evento**: shape `{ id, type, timestamp, data }` con `id` de evento UUID y `type` versionado (`payment.created.v1`); nunca envíes la tabla cruda.
2. **Firma el payload**: HMAC-SHA256 del body crudo con un secret compartido; el receptor verifica en **tiempo constante** antes de procesar nada (mitiga timing attacks).
3. **Implementa retries con backoff exponencial**: reintenta entregas fallidas (timeout, 5xx) en `1m, 5m, 30m, 2h, 12h` (hasta ~15 intentos) con jitter; los 4xx (salvo `429`) **no se reintentan**.
4. **Agrega idempotencia**: el receptor deduplica por `event.id` (índice único + tabla de eventos); el envío puede incluir un header `Idempotency-Key` por request.
5. **Pon timeouts**: timeout de conexión corto (5-10 s) y de lectura acotado; un receptor lento no debe bloquear el emisor.
6. **Protege el listener**: valida firma y body antes de procesar; responde `200` rápido tras encolar y procesa de forma asíncrona.
7. **Implementa replay y dead-letter**: guarda las entregas que agotan los retries en una cola DLQ con payload y headers intactos (para re-firmar/reenviar); expón un reenvío manual.
8. **Testea el ciclo**: construye el firmador/receptor de prueba, manda eventos duplicados y tardíos; usa `grep` en el código para verificar que la verificación de firma ocurre antes de tocar la base.
9. **Monitorea**: métricas de entregas ok/failed/retries, alerta si la DLQ crece; logs sin payloads sensibles ni secrets.

## Checklist

- [ ] Payload firmado con HMAC-SHA256 y verificado en tiempo constante
- [ ] Retries con backoff exponencial + jitter para 5xx/timeouts; 4xx no reintentado
- [ ] Idempotencia por `event.id` con índice único en el receptor
- [ ] Timeouts de conexión y lectura acotados
- [ ] `200` temprano + procesamiento asíncrono en el receptor
- [ ] DLQ con replay manual para entregas agotadas
- [ ] Header identificable del emisor (`User-Agent`, `X-Webhook-*`)
- [ ] Tests cubren firma, replay y duplicados

## Common Pitfalls / Anti-patterns

- **Comparar firmas sin tiempo constante**: `a === b` en JS tiene diferencia temporal; usa `crypto.timingSafeEqual`.
- **Verificar la firma después de procesar**: cualquier dato procesado sin verificar es superficie de ataque (fake webhooks).
- **Retries sin límite o sin backoff**: reintentar cada segundo amplifica el problema y castiga al receptor.
- **Reintentar 4xx**: un `400` no se arregla reintentando; responde error inmediato (config mal, payload inválido).
- **Sin idempotencia**: un retry legítimo duplica pagos, registros o notificaciones en el receptor.
- **Timeout ausente o infinito**: un receptor colgado bloquea el emisor; fija timeouts y falla rápido.
- **Replay sin contexto**: el reenvío necesita el payload original + headers (firma) intactos; guarda ambos en la DLQ.
- **Logs con secretos o payloads**: firmas y datos personales en logs violan auditoría y privacidad.

## Ejemplos

### Firmar y verificar (verificación antes de tocar datos)

```ts
// Emisor
const sig = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex')

// Receptor — antes de procesar cualquier dato
const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
const a = Buffer.from(sig)
const b = Buffer.from(expected)
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new AppError(401, 'firma de webhook inválida')
}
```

### Retries con backoff + jitter

```ts
const BACKOFF = [1_000, 5_000, 30_000, 120_000, 600_000] // 1m → 10m
const delay = BACKOFF[attempt] ?? 3_600_000
const wait = delay + Math.random() * 0.25 * delay // jitter ±25%
```

### Receptor idempotente

```sql
CREATE UNIQUE INDEX idx_webhook_events_id ON webhook_events (event_id);

-- al recibir: NULL en el RETURNING → evento duplicado, responder 200 sin reprocesar
INSERT INTO webhook_events (event_id, type, payload)
VALUES ($1, $2, $3)
ON CONFLICT (event_id) DO NOTHING
RETURNING id;
```
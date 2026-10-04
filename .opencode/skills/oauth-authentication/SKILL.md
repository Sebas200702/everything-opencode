---
name: oauth-authentication
description: Usa esta skill al integrar OAuth2/OIDC, implementar login con proveedores externos (Google, GitHub, Microsoft, etc.), emitir o validar JWT, manejar refresh tokens o elegir entre authorization code, PKCE y client credentials.
---

# OAuth2 / OIDC / JWT

Flujos estándar de autenticación y autorización con OAuth2, OpenID Connect y JWT: cuál elegir, cómo implementarlo de forma segura y con qué bibliotecas.

## When to Use

- Login con proveedor externo (Google, GitHub, Microsoft) vía OAuth2/OIDC
- Implementar "Login con X" en frontend o mobile (aquí casi siempre aplica **authorization code + PKCE**)
- Comunicación servidor-a-servidor (aquí normalmente **client credentials**)
- Emitir o validar JWT propios, manejar refresh tokens y scopes
- Revisar una integración OAuth existente por problemas de seguridad

## Workflow

1. **Elige el flujo según el cliente**:
   - SPA/mobile: **Authorization Code + PKCE** (nunca `implicit` — está deprecado).
   - Servidor confiable: **Authorization Code** clásico con `client_secret`.
   - M2M (servidor→API): **Client Credentials**.
   - Dispositivos sin navegador (CLI/TV): **Device Flow**.
2. **Registra el cliente**: consigue `client_id` (+ `client_secret` si aplica) y configura los redirect URIs exactos; nunca comodines en producción.
3. **Implementa el flujo elegido** con la biblioteca del framework (Better Auth, Auth.js/NextAuth, una lib OAuth2 de Node), no a mano: `authorize` → callback → canje de código por tokens → validación.
4. **Valida el ID token (OIDC)**: firma (JWKS del issuer), `iss`, `aud`, `exp` y `nonce` (anti-replay). Nunca confíes en el payload sin verificar la firma.
5. **Define scopes mínimos**: pide solo lo que la app usa (`openid profile email`); rechaza tokens con scopes que no corresponden.
6. **Maneja refresh tokens**: en servidor guárdalos en almacén seguro y cifrado; en SPA no van en `localStorage` (vulnerable a XSS): usa rotación (`refresh_token_rotation`) y detección de reuse con revocación.
7. **Firma y expira los JWT propios**: `exp` corto (15 min típico), `iss`/`aud` fijos, firma `RS256`/`ES256` (nunca `none`, nunca HS256 con secret débil), `kid` para rotación de llaves.
8. **Prueba el flujo completo**: usa `grep` para revisar cómo se leen `client_id` y secret desde el entorno, `read` el handler del callback para verificar las validaciones, y corre tests de éxito + token inválido/vencido + `nonce` reutilizado.
9. **Audita**: revisa logs sin tokens sensibles, revocación (`logout`/revoke endpoint) y rate-limit en `authorize`/`token`.

## Checklist

- [ ] Flujo elegido correcto para el tipo de cliente (PKCE en SPA/mobile, nunca implicit)
- [ ] Redirect URIs exactas, sin comodines en producción
- [ ] ID token validado: firma (JWKS), `iss`, `aud`, `exp`, `nonce`
- [ ] Scopes mínimos necesarios
- [ ] Refresh tokens en almacén seguro / rotación con detección de reuse
- [ ] JWT propios con exp corta, firma asimétrica y `kid`
- [ ] Secretos solo por entorno (`process.env.*`), nunca en el repo
- [ ] `state` (anti-CSRF) y `nonce` (anti-replay) verificados

## Common Pitfalls / Anti-patterns

- **Implicit flow**: deprecado; el token viaja en la URL y se filtra en logs e historial.
- **No validar la firma del ID token**: confiar en `decode()` sin verificar credenciales permite forjar identidades.
- **`client_secret` en SPA**: cualquiera puede leerlo; por eso existe PKCE.
- **Refresh token sin rotación**: un token robado vale para siempre; aplica rotación y revoca ante reuse.
- **JWT en `localStorage`**: vulnerable a XSS; prefiere cookies `HttpOnly` + `Secure`/`SameSite` o storage en memoria.
- **Scopes excesivos**: pedir `email` cuando solo se necesita `openid profile` amplía la superficie de datos.
- **`state` ausente**: sin el parámetro `state` (y su verificación) el login es vulnerable a CSRF login.
- **Exp de refresco larga sin revocación**: define política de revocación (logout, cambio de contraseña) y revoca del lado del proveedor.

## Ejemplos

### Flujo authorization code + PKCE

```text
1. SPA genera code_verifier + code_challenge (S256) y state
2. → GET /authorize?client_id=...&code_challenge=S256...&state=...
3. ← 302 a redirect_uri con ?code=...&state=...
4. SPA verifica state y hace POST /token con code + code_verifier
5. ← access_token + refresh_token (+ id_token si OIDC)
```

### Validación mínima de ID token

```ts
const { payload } = await jwtVerify(idToken, getJwks(issuer), {
  issuer,
  audience: clientId,
})
if (payload.nonce !== sessionNonce) throw new Error('nonce mismatch')
```

### Client credentials (M2M)

```ts
// POST /token con grant_type=client_credentials
// → access_token para llamar APIs del proveedor con scope limitado
const token = await clientCredentialsGrant(clientId, clientSecret, ['analytics:read'])
```

### Bibliotecas recomendadas

- Node: `oauth4webapi`, `openid-client`, o las del framework (Better Auth, Auth.js)
- JWT: `jose` (RS256/ES256, JWKS) — verifica siempre el algoritmo antes de validar
- Login integrado con base propia de usuarios: Better Auth / Auth.js (manejan PKCE, state, nonce y refresh por ti)
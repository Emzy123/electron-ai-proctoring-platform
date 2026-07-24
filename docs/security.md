# CUSTECH Security Model

## Electron Client Security

| Control | Implementation |
|---------|----------------|
| Context isolation | `contextIsolation: true` |
| Node integration | Disabled |
| Sandbox | Enabled |
| DevTools | Disabled in production builds |
| Network | All HTTP via main process with optional cert pinning |
| Token storage | `safeStorage` encryption in main process |
| Single instance | `requestSingleInstanceLock()` |

## Lockdown Capabilities

| Threat | Mitigation |
|--------|------------|
| Alt+F4, F12, Ctrl+Shift+I | Blocked via globalShortcut + before-input-event |
| Right/middle click | Blocked in renderer + main |
| Alt+Tab, Win+D | Partial — blur detection triggers violation |
| Ctrl+Alt+Del | Not blockable — requires managed lab PCs |
| Kiosk exit | Supervisor password required |

## API Security

- JWT access tokens: 15 minute expiry
- Refresh token rotation: 7 days, single-use
- Request nonces: Redis-backed replay protection (5 min TTL)
- Helmet.js CSP headers
- Rate limiting: global, auth, per-exam, per-tenant
- Frame uploads: HMAC-signed with timestamp

## Exam Integrity

- Exam manifest signed before distribution
- Answers encrypted locally (AES-256-GCM)
- Hash chain: `hash(n) = SHA-256(answer + hash(n-1) + salt)`
- Server-side integrity verification on submit

## Security Checklist

- [ ] Electron launches with `--inspect` blocked in production
- [ ] All renderer network calls route through main process
- [ ] JWT refresh rotation works
- [ ] Request nonce rejected on replay
- [ ] Exam manifest signature invalid → exam blocked
- [ ] Hash chain matches server computation
- [ ] Process blacklist triggers auto-submit
- [ ] Kiosk exit requires supervisor password
- [ ] Evidence stored in MinIO, not MongoDB blobs
- [ ] Audit log captures admin actions
- [ ] Monitoring consent recorded before exam

## Compliance

- NDPR: data export (`GET /api/admin/users/:id/export`) and deletion endpoints
- Data retention configurable per tenant
- Audit trail for all administrative actions

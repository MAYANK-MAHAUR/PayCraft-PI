# PayCraft - PI Payment Interface

Developer-first payment platform built around a UPI-style Payment Interface (PI) for instant money movement, camera QR scanning, and real-time merchant analytics.

---

## Demo Video




https://github.com/user-attachments/assets/10a1d48b-7516-401d-9c9f-40d849163bef





---

## Key Features

- **Google OAuth 2.0:** Live Google Identity Services sign-in with JWT session persistence.
- **P2P Wallet Transfers:** Instant transfers between PI handles (`user@paycraft`) with balance locks and ledger rows.
- **Camera QR Checkout:** Scan terminal or mobile QR codes directly from any phone camera or Google Lens.
- **Hosted Checkout Sessions:** Stripe-style hosted payment pages with scannable payment references.
- **Idempotent REST API:** Dual-mode API keys (`pk_test_`, `pk_live_`) with Valkey-backed idempotency headers.
- **Real-Time Event Stream:** Server-Sent Events (SSE) push instant audio confirmation chimes and dashboard updates.

---

## Zerops Architecture

PayCraft is deployed natively across **6 containerized Zerops services** orchestrated via a single `zerops.yml`:

| Service | Type | Description |
|:---|:---|:---|
| **`frontend`** | Static (React + Vite SPA) | Served via Nginx with environment variable bindings |
| **`api`** | Node.js 22 (Express) | REST API server handling auth, ledger, checkouts, and SSE |
| **`worker`** | Node.js 22 | Async background worker for retrying failed webhooks |
| **`db`** | PostgreSQL 16 | Primary relational database for merchant accounts and ledger |
| **`cache`** | Valkey | Key-value memory cache for rate limits and idempotency |
| **`storage`** | Object Storage | S3-compatible bucket for invoices and CSV exports |

---

## Testing Instructions

1. **Visit Live App:** Open https://frontend-2ba1.prg1.zerops.app/
2. **Starter Balance:** Every new account automatically receives **$1,000 USD paper money balance**.
3. **Send Payments:** Create two accounts to send funds back and forth, or pay directly to `mayankgaming179@paycraft`.
4. **Test QR Checkout:** Try scanning merchant QR codes on the PI Payments tab using your phone camera.

---

## Zerops Platform Review

Feedback on using Zerops for full-stack application deployment:

### Positive Aspects

- Cost efficiency: Friendly pricing model for developers and indie applications.
- Service catalog: Seamless integration of static frontend, API, worker, PostgreSQL, Valkey, and object storage in one project.
- Unified environment: Eliminates managing disparate infrastructure providers for database, cache, and compute.
- Developer CLI (`zcli`): `zcli push` is clean, predictable, and simple to automate.
- Zerops Control Panel (ZCP): Flexible configuration capabilities for custom build pipelines.
- Comprehensive documentation and onboarding defaults.

### Opportunities for Improvement

- Control panel user experience could be streamlined for easier navigation.
- Light theme contrast requires improvement for visibility of certain status labels and text.
- Initial platform concepts present a learning curve for first-time users.
- Deployment failure logs could provide more granular error trace details.

### Recommended Feature Enhancements

- Support browser-based Google OAuth authentication for `zcli login` in addition to API token credentials.

---

## AI Disclosure

We utilized AI assistance for rapidly building complex backend and frontend workflows, debugging infrastructure integration challenges, and optimizing overall codebase design and performance.

---

*Built for the Zerops Challenge Hackathon 2026*

# Profit.com Academy · certificates API

The prototype runs these rules in the browser (`static/js/certs.js` `AC.certs`, registry in `AC.store` +
`content/demo/certificates.json`). On Profit.com the server owns them; table: `001_certificates.sql`.

## Certificate ID

`PREFIX-XXXX-XXXX`, stored uppercase with dashes (`certificates.id`).

- `PREFIX` per path, from `content/<locale>/catalog.json` `certPrefix`: learn-to-trade `TF`, technical-analysis-pro `TA`,
  risk-management `RM`, understanding-companies `UC`, investor `IE`, macro-news-trader `MN`, portfolio-management `PM`,
  options-playbook `OE`, crypto-trader `CT`.
- `X`: 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31; no `0 O 1 I L`), from a cryptographic RNG
  (31^8 ≈ 8.5 × 10^11 per prefix).
- Unique: insert, and on a unique violation of `id_key` generate a new code and retry (at most 5 tries, then 500).

## Issue: `POST /academy/paths/:id/finish`

Auth: the signed-in learner. The client never asks for a certificate on its own; it is issued automatically, in the
**same transaction** as the path completion:

1. Lock the learner's progress row; check the finale rules (every Chapter Challenge passed or tested out; the path's
   last chapter has a plan: all five sections have text). Not ready → `409 {"error": "not_ready", "challenges": n, "total": n, "plan": n, "planTotal": 5}`.
2. Already finished → `200` with the existing certificate and `"xp": 0, "coins": 0` (idempotent; never a second certificate:
   unique `(user_id, path)`).
3. Otherwise: mark the path finished, +500 XP, +500 Profit Coins, and insert the certificate with
   `name_snapshot` = the account's display name now, `issued_at = now()`. Commit.

```json
200 {
  "ok": true, "xp": 500, "coins": 500, "rankUp": "strategist",
  "certificate": { "id": "TF-7K2Q-9D4M", "name": "Jordan Ellis", "path": "learn-to-trade",
                   "path_title": "Trading Foundations", "tier": "free", "issued_at": "2027-03-12T09:41:00Z",
                   "verify_url": "https://www.profit.com/academy/verify/TF-7K2Q-9D4M" }
}
```

The learner's certificates also come back with their progress record (`certificates: [{path, id, d, name}]`).

## Public lookup: `GET /academy/certificates/:id`

No auth. Read-only.

- Normalize the input: trim, uppercase, remove spaces and dashes. Then an **exact** match on `id_key`.
  No partial, prefix, fuzzy or "did you mean" matches, ever. Input longer than 40 characters or with characters outside
  `A-Z 0-9` after normalizing → `404` without a query.
- `200`:

```json
{ "id": "TF-7K2Q-9D4M", "name": "Jordan Ellis", "path": "learn-to-trade",
  "path_title": "Trading Foundations", "tier": "free", "issued_at": "2027-03-12T09:41:00Z" }
```

  `path_title` and `tier` come from the catalog (the locale of the request; English fallback). Nothing else about the
  learner is returned (no user id, email, handle or progress).
- `404 {"error": "not_found"}` for any ID that doesn't match exactly (same body and timing whether or not a similar ID exists).
- Headers: `Cache-Control: public, max-age=300`; `X-Robots-Tag: noindex, nofollow`.
- Rate limit: per IP, e.g. 30 lookups a minute and 300 an hour (429 with `Retry-After`), so the ID space can't be
  enumerated; log repeated 404 bursts.

## Verify page

Public address: `https://www.profit.com/academy/verify/<ID>` (QR codes, LinkedIn `certUrl`, share links).
The static page is `academy/verify/index.html`; it reads the ID from `?id=` or from the path after `/verify/`.
Serve it with a rewrite (or a 301 to the `?id=` form):

```
/academy/verify/<ID>   →   /academy/verify/index.html?id=<ID>     (no trailing slash after the ID)
```

The page and every result are `noindex, nofollow` and are not in the sitemap. In production the page calls
`GET /academy/certificates/:id` instead of `AC.certs.lookup`.

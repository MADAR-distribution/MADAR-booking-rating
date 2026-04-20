# MADAR public booking & rating (static HTML)

Static pages for **booking** and **rating**, deployable on **Netlify** (or any static host with URL rewrites).

## Deploy on Netlify

1. **Create a site** → Import from Git → select this repository.
2. **Build settings** (auto-detected from `netlify.toml`):
   - **Build command:** `node scripts/netlify-build.cjs`
   - **Publish directory:** `.` (repo root)
3. **Environment variable** (recommended for production):
   - In Netlify: **Site settings → Environment variables → Add variable**
   - Name: `API_BASE_URL`
   - Value: your backend origin, e.g. `https://api.yourdomain.com` (no trailing slash)
   - On each deploy, the build replaces `window.__API_BASE__ = "http://localhost:8000"` in `index.html`, `booking/index.html`, and `rating/index.html` with that URL.
4. **CORS:** your API must allow requests from your Netlify site domain (e.g. `https://yoursite.netlify.app`).
5. **URLs after deploy:**
   - Landing: `/`
   - Booking: `/booking/<companyId>` or `/booking/<name>-<companyId>`
   - Rating: `/rating/<serviceId>`

If you skip `API_BASE_URL`, the build does nothing and pages keep their default; visitors can still paste the API URL in the on-page config form (stored in `localStorage`).

---

## Booking URLs

- `/booking/<companyName>-<companyId>` (recommended)
- `/booking/<companyId>` (supported)

### Booking API endpoints

- `GET /api/public/booking/get_branches_by_company_id/?company_id=...`
- `GET /api/public/booking/get_services_by_branch_id/?branch_id=...`
- `GET /api/public/booking/get_service_schedule/?service_id=...&date=...&day=...`
- `POST /api/public/booking/add_turn_web/`
- `POST /api/public/booking/add_booking/`
- `GET /api/public/booking/get_bookings_by_reference/?reference=...&device_id=...`

## Files

- `index.html`: landing (company id + rating shortcut).
- `booking/index.html`: booking app.
- `rating/index.html`: rating app.
- `assets/booking.css` / `assets/booking.js`: booking UI.
- `assets/rating.css` / `assets/rating.js`: rating UI.
- `netlify.toml`: Netlify build, SPA-style rewrites, cache headers.
- `scripts/netlify-build.cjs`: injects `API_BASE_URL` at build time.

## Configure API base URL

1. **Netlify:** set environment variable `API_BASE_URL` (see above).
2. **Manual:** edit `index.html`, `booking/index.html`, and `rating/index.html` — set `window.__API_BASE__` to your API origin.
3. **Visitor override:** open the booking/rating page and use the config form (saved in `localStorage`).

## Hosting rewrites

- **Netlify:** `netlify.toml` includes `/booking/*` and `/rating/*` → the correct `index.html` files.
- **Vercel:** `vercel.json` includes booking rewrites (add rating rewrites there if you use Vercel).
- **Nginx** (example):

```nginx
location /booking/ {
  try_files $uri /booking/index.html;
}
```

## Local run

From this folder:

```bash
python3 -m http.server 5173
```

Then open:

- `http://localhost:5173/`
- `http://localhost:5173/booking/<companyName>-<companyId>`
- `http://localhost:5173/booking/<companyId>`
- `http://localhost:5173/rating/index.html?serviceId=<serviceId>` (plain static server; Netlify gives `/rating/<serviceId>`)

## Notes

- The page stores a `device_id` in `localStorage` to support reference-based booking lookups.
- Your API must allow **CORS** from the domain you host this page on.


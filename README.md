# Public booking (static HTML)

This folder contains a **static** public booking page that can be shared as:

- `/booking/<companyName>-<companyId>` (recommended)
- `/booking/<companyId>` (supported)

It calls your existing public booking API endpoints:

- `GET /api/public/booking/get_branches_by_company_id/?company_id=...`
- `GET /api/public/booking/get_services_by_branch_id/?branch_id=...`
- `GET /api/public/booking/get_service_schedule/?service_id=...&date=...&day=...`
- `POST /api/public/booking/add_turn_web/`
- `POST /api/public/booking/add_booking/`
- `GET /api/public/booking/get_bookings_by_reference/?reference=...&device_id=...`

## Files

- `index.html`: simple landing (enter company id).
- `booking/index.html`: the booking app page.
- `assets/booking.css`: styles.
- `assets/booking.js`: booking logic.

## Configure API base URL

Set your production API base URL (the equivalent of `NEXT_PUBLIC_API_URL`) in one of these ways:

1. **Recommended**: edit `booking/index.html` and `index.html` and set:

```html
<script>
  window.__API_BASE__ = "https://YOUR_PROD_API_BASE_HERE";
</script>
```

2. Or open `/booking/<companyId>` and paste the API base URL into the on-page config form (it will store it in `localStorage`).

## Hosting rewrites (for /booking/*)

This is a static site, so you need a rewrite so any `/booking/*` path serves `booking/index.html`.

- **Netlify**: `netlify.toml` is included.
- **Vercel**: `vercel.json` is included.
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

## Notes

- The page stores a `device_id` in `localStorage` to support reference-based booking lookups.
- Your API must allow **CORS** from the domain you host this page on.


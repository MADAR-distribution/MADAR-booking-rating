/**
 * Netlify build hook: inject production API base into static HTML.
 * Set API_BASE_URL in Netlify: Site settings → Environment variables.
 * Example: https://api.yourdomain.com (no trailing slash)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envUrl = (process.env.API_BASE_URL || "").trim().replace(/\/+$/, "");

if (!envUrl) {
  console.log(
    "[netlify-build] API_BASE_URL not set — publishing with default localhost (visitors can still save API URL via the on-page config form)."
  );
  process.exit(0);
}

const escaped = envUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const targets = ["index.html", "booking/index.html", "rating/index.html"];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn(`[netlify-build] Skip missing file: ${rel}`);
    continue;
  }
  let html = fs.readFileSync(file, "utf8");
  const next = html.replace(
    /window\.__API_BASE__\s*=\s*"http:\/\/localhost:8000";/g,
    `window.__API_BASE__ = "${escaped}";`
  );
  if (next === html) {
    console.warn(`[netlify-build] No localhost __API_BASE__ pattern found in ${rel}`);
  } else {
    fs.writeFileSync(file, next);
  }
}

console.log("[netlify-build] Injected API_BASE_URL into HTML.");

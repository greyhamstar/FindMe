# FindMe v21.2 (Full Code, Non-module JS)

**If geolocation or imports failed before, use this build.** It removes ES module imports and adds a Reset.

## Quick start
1. Unzip.
2. Start a local server in the folder (e.g. `python -m http.server 5500`).
3. Open `http://localhost:5500/` (required for geolocation on most browsers).
4. Sign in with seeds:
   - Company: `demo@brand.local` / `demo123`
   - Promoter: `promoter@demo.local` / `demo123`

## Tips
- If data looks weird, click **Reset** in the navbar or add `?reset=1` to the URL to reseed localStorage.
- Promoter → Dashboard shows **assigned store**; tap name to preview map; **Check in** when within geofence.
- Burger menu is the classic, stable implementation (no frameworks).
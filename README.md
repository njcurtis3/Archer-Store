# Archer Store

Unit apparel store for A CO 440th Civil Affairs, hosted on GitHub Pages. Products come live from the `catalog` tab of the order spreadsheet; checkout writes orders into the `Orders List` tab.

## Files
- `index.html`, `style.css`, `app.js` — the site
- `config.js` — sheet ID, order endpoint, sizes, logo colors, fallback prices
- `apps-script/Code.gs` — receives orders and writes them into the sheet

## Managing products
Edit the `catalog` tab. Columns: `Catalog` (product link) · `type` · `Apparel #` · `Apparel Name`. Optional extra columns the site picks up automatically:
- `price` — per-unit price (otherwise the fallback in `config.js` is used; items without one show "Price TBD")
- `image` — a direct image URL for the product card

## Turn on GitHub Pages
Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. The site appears at `https://njcurtis3.github.io/Archer-Store/` within a minute or two.

## Connect checkout to the sheet
1. Open the spreadsheet → **Extensions → Apps Script**, paste in `apps-script/Code.gs`, save.
2. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*. Authorize when prompted.
3. Copy the `/exec` URL into `ORDER_ENDPOINT` in `config.js` and commit.

Until step 3 is done, checkout opens an email with the order details instead.

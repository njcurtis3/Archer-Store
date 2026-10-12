# Archer Store

Unit apparel store for A CO 440th Civil Affairs, hosted on GitHub Pages at https://njcurtis3.github.io/Archer-Store/.

- `index.html` / `store.js` — the store. Customers add items to a cart and check out with name and phone.
- `admin.html` / `admin.js` — admin page (sign in with Google; only nathanjcurtis3@gmail.com gets in). Orders with order numbers, notes, editing, paid and picked-up tracking, text reminders with a Venmo link, a printable pickup list, selection totals, a supplier summary and size-grid CSV, order CSV export, prices, item costs, tax, printer fees, totals and profit.
- `products.js` — the catalog (items, photos, sizes, logo colors) and admin email.
- `firebase-config.js` — Firebase project settings.
- `firestore.rules` — database security rules. Item costs live in `private/costs`, readable only by the admin.
- `.github/workflows/pages.yml` — publishes the site. It replaces `?v=dev` on CSS and JS links with the commit, so browsers don't mix cached old files with new ones after an update. Keep the `?v=dev` tag on any new `.css`/`.js` link or import.

Orders are stored in Firebase Cloud Firestore. See the setup steps below.

## One-time Firebase setup
1. Go to console.firebase.google.com → **Add project** (Google Analytics not needed).
2. **Build → Firestore Database → Create database** → production mode → pick a US location.
3. **Firestore → Rules**: replace everything with the contents of `firestore.rules` → **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Google → Enable** → save.
5. **Authentication → Settings → Authorized domains → Add domain** → `njcurtis3.github.io`.
6. **Project settings (gear) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values into `firebase-config.js` and commit.

## Changing products
Edit `PRODUCTS` in `products.js`. Prices and the tax rate are changed on the admin page.

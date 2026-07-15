# MarketBee — Static E-Commerce Storefront

A dependency-free HTML/CSS/JS storefront with a multi-list wishlist feature (including list merging), built to run entirely as static files.

## Run locally
Just open `index.html` in a browser, or serve the folder so `fetch()` can load `data/products.json`:
To visit hosted site click on https://srinidhiswami.github.io/e-commerce-storefront/

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Opening `index.html` directly via `file://` can block the `fetch()` call in some browsers — use a local server if products don't load.)

## Host on GitHub Pages
1. Push this folder's contents to a GitHub repo (root, or a `/docs` folder).
2. In the repo: **Settings → Pages → Source** → pick the branch (and folder) containing `index.html`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

## Structure
```
index.html      Home page (hero + best sellers)
search.html     Live product search
product.html    Product detail (?id=... in the URL)
wishlist.html   Multiple wishlists + merge feature
css/style.css   All styling
js/store.js     Product loading, wishlist storage, ratings, toasts
js/product-card.js  Shared product card renderer
data/products.json  Mock product catalog (the "API")
```

## Notes
- All data (wishlists, ratings) is stored in the browser's `localStorage` — nothing leaves the device.
- Star ratings show a seeded average plus your own personal rating, clearly labeled since there's no backend to aggregate real votes.
- Product images are placeholder images from placehold.co.

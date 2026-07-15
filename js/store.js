/* =========================================================
   store.js — shared across all pages
   Handles: product loading, wishlists (+ merge), ratings, toasts
========================================================= */

const DATA_URL = 'data/products.json';
const LS_WISHLISTS = 'marketbee_wishlists_v1';
const LS_ACTIVE = 'marketbee_active_wishlist_v1';
const LS_RATINGS = 'marketbee_user_ratings_v1';

/* ---------- product data (mock API) ---------- */
let _productsCache = null;

async function fetchProducts(){
  if(_productsCache) return _productsCache;
  const res = await fetch(DATA_URL);
  if(!res.ok) throw new Error('Could not load product catalog');
  _productsCache = await res.json();
  return _productsCache;
}

async function getProductById(id){
  const products = await fetchProducts();
  return products.find(p => p.id === id) || null;
}

/* ---------- wishlist storage ----------
   wishlists shape:
   { [listId]: { id, name, createdAt, items: [{ productId, addedAt }] } }
------------------------------------------ */

function _uid(prefix='list'){
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

function _readWishlists(){
  const raw = localStorage.getItem(LS_WISHLISTS);
  if(raw) return JSON.parse(raw);

  // first run: seed a default wishlist
  const defaultId = _uid('list');
  const seeded = {
    [defaultId]: { id: defaultId, name: 'My Wishlist', createdAt: Date.now(), items: [] }
  };
  localStorage.setItem(LS_WISHLISTS, JSON.stringify(seeded));
  localStorage.setItem(LS_ACTIVE, defaultId);
  return seeded;
}

function _writeWishlists(data){
  localStorage.setItem(LS_WISHLISTS, JSON.stringify(data));
}

function getWishlists(){
  return _readWishlists();
}

function getActiveWishlistId(){
  let id = localStorage.getItem(LS_ACTIVE);
  const lists = _readWishlists();
  if(!id || !lists[id]){
    id = Object.keys(lists)[0];
    localStorage.setItem(LS_ACTIVE, id);
  }
  return id;
}

function setActiveWishlistId(id){
  localStorage.setItem(LS_ACTIVE, id);
}

function createWishlist(name){
  const lists = _readWishlists();
  const id = _uid('list');
  lists[id] = { id, name: name || 'New List', createdAt: Date.now(), items: [] };
  _writeWishlists(lists);
  return id;
}

function deleteWishlist(id){
  const lists = _readWishlists();
  if(Object.keys(lists).length <= 1) return false; // always keep at least one
  delete lists[id];
  _writeWishlists(lists);
  if(getActiveWishlistId() === id){
    setActiveWishlistId(Object.keys(lists)[0]);
  }
  return true;
}

function isInWishlist(productId, listId){
  const lists = _readWishlists();
  const id = listId || getActiveWishlistId();
  const list = lists[id];
  return !!list && list.items.some(i => i.productId === productId);
}

function isInAnyWishlist(productId){
  const lists = _readWishlists();
  return Object.values(lists).some(l => l.items.some(i => i.productId === productId));
}

function toggleWishlistItem(productId, listId){
  const lists = _readWishlists();
  const id = listId || getActiveWishlistId();
  const list = lists[id];
  if(!list) return false;
  const idx = list.items.findIndex(i => i.productId === productId);
  let added;
  if(idx > -1){
    list.items.splice(idx, 1);
    added = false;
  } else {
    list.items.push({ productId, addedAt: Date.now() });
    added = true;
  }
  _writeWishlists(lists);
  return added;
}

function removeFromWishlist(productId, listId){
  const lists = _readWishlists();
  const list = lists[listId];
  if(!list) return;
  list.items = list.items.filter(i => i.productId !== productId);
  _writeWishlists(lists);
}

function wishlistItemCount(){
  const lists = _readWishlists();
  const seen = new Set();
  Object.values(lists).forEach(l => l.items.forEach(i => seen.add(i.productId)));
  return seen.size;
}

/* ---------- merge ----------
   Merges listA + listB by productId, keeping the earliest addedAt
   for duplicates. Returns a preview array (does not save).
------------------------------------------ */
function computeMergePreview(listIdA, listIdB){
  const lists = _readWishlists();
  const a = lists[listIdA]?.items || [];
  const b = lists[listIdB]?.items || [];
  const map = new Map();

  [...a, ...b].forEach(item => {
    const existing = map.get(item.productId);
    if(!existing || item.addedAt < existing.addedAt){
      map.set(item.productId, { productId: item.productId, addedAt: item.addedAt });
    }
  });

  const merged = Array.from(map.values());
  const dupeIds = new Set(
    a.map(i => i.productId).filter(id => b.some(bi => bi.productId === id))
  );
  return { merged, dupeCount: dupeIds.size, dupeIds };
}

function commitMerge({ listIdA, listIdB, mergedItems, mode, newListName }){
  const lists = _readWishlists();

  if(mode === 'new'){
    const id = _uid('list');
    lists[id] = { id, name: newListName || 'Merged Wishlist', createdAt: Date.now(), items: mergedItems };
    _writeWishlists(lists);
    return id;
  }

  // overwrite one existing list, optionally delete the other
  const targetId = mode === 'overwriteA' ? listIdA : listIdB;
  const otherId = mode === 'overwriteA' ? listIdB : listIdA;
  lists[targetId].items = mergedItems;
  if (Object.keys(lists).length > 1 && otherId !== targetId) {
    delete lists[otherId];
  }
  _writeWishlists(lists);
  if(getActiveWishlistId() === otherId) setActiveWishlistId(targetId);
  return targetId;
}

/* ---------- personal ratings (static-site friendly) ---------- */
function _readRatings(){
  return JSON.parse(localStorage.getItem(LS_RATINGS) || '{}');
}
function getUserRating(productId){
  return _readRatings()[productId] || 0;
}
function setUserRating(productId, value){
  const ratings = _readRatings();
  ratings[productId] = value;
  localStorage.setItem(LS_RATINGS, JSON.stringify(ratings));
}

/* blend the user's rating into the seeded average, client-side only */
function blendedRating(product){
  const userR = getUserRating(product.id);
  if(!userR) return product.rating;
  const { avg, count } = product.rating;
  const newCount = count + 1;
  const newAvg = ((avg * count) + userR) / newCount;
  return { avg: Math.round(newAvg * 10) / 10, count: newCount };
}

/* ---------- toast ---------- */
function showToast(message, type = 'success'){
  let root = document.getElementById('toast-root');
  if(!root){
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2200);
}

/* ---------- star rendering helper ---------- */
function starString(avg){
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/* ---------- header wiring (shared across pages) ---------- */
function initHeader(activePage){
  const badge = document.querySelector('[data-wish-badge]');
  if(badge){
    const count = wishlistItemCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === activePage);
  });
}

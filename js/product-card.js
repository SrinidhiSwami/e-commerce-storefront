/* Renders a product card. `context` lets us know which wishlist
   the heart toggle should act on (used on wishlist.html). */
function renderProductCard(product, { context } = {}){
  const rating = blendedRating(product);
  const inWish = isInAnyWishlist(product.id);

  const card = document.createElement('article');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="price-tag">$${product.price.toFixed(2)}</div>
    <a href="product.html?id=${product.id}" class="product-media" aria-label="View ${product.name}">
      <img src="${product.image}" alt="${product.alt}" loading="lazy">
    </a>
    <button class="wish-toggle ${inWish ? 'active' : ''}" aria-label="Toggle wishlist" title="Add to wishlist">
      ${inWish ? '♥' : '♡'}
    </button>
    <div class="product-body">
      <span class="product-category">${product.category}</span>
      <a href="product.html?id=${product.id}"><h3 class="product-name">${product.name}</h3></a>
      <div class="rating-line">
        <span class="stars">${starString(rating.avg)}</span>
        <span>${rating.avg.toFixed(1)} · ${rating.count}</span>
      </div>
      <div class="card-foot">
        <a href="product.html?id=${product.id}" class="btn btn-outline">View</a>
      </div>
    </div>
  `;

  const wishBtn = card.querySelector('.wish-toggle');
  wishBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const listId = context?.listId || getActiveWishlistId();
    const added = toggleWishlistItem(product.id, listId);
    wishBtn.classList.toggle('active', added);
    wishBtn.textContent = added ? '♥' : '♡';
    showToast(added ? `Added "${product.name}" to wishlist` : `Removed "${product.name}" from wishlist`);
    initHeader(document.body.dataset.page);
    if(context?.onChange) context.onChange();
  });

  return card;
}

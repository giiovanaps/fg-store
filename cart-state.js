// Only fictional product IDs and quantities are persisted. No customer data.
export function createCart(catalog, storage, key = 'fg-demo-cart-v1') {
  const products = new Map(catalog.map(product => [product.id, product]));
  const quantities = new Map();
  try {
    const saved = JSON.parse(storage?.getItem(key) || '[]');
    if (Array.isArray(saved)) {
      for (const entry of saved) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [id, quantity] = entry;
        if (products.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99) quantities.set(id, quantity);
      }
    }
  } catch { /* The demo also works when storage is blocked or malformed. */ }

  function persist() {
    try { storage?.setItem(key, JSON.stringify([...quantities])); } catch { /* Keep the current page's cart. */ }
  }
  const cart = {
    add(id) {
      if (!products.has(id)) return;
      quantities.set(id, Math.min(99, (quantities.get(id) || 0) + 1));
      persist();
    },
    change(id, delta) {
      if (!quantities.has(id) || !Number.isInteger(delta)) return;
      const next = Math.min(99, quantities.get(id) + delta);
      if (next <= 0) quantities.delete(id);
      else quantities.set(id, next);
      persist();
    },
    remove(id) { quantities.delete(id); persist(); },
    clear() { quantities.clear(); persist(); },
    entries() { return [...quantities].map(([id, quantity]) => ({ product: products.get(id), quantity })); },
    count() { return [...quantities.values()].reduce((total, quantity) => total + quantity, 0); },
    subtotal() { return Math.round(cart.entries().reduce((total, { product, quantity }) => total + product.price * quantity, 0) * 100) / 100; }
  };
  return cart;
}

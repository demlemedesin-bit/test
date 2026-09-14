export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  priceDisplay: string;
  qty: number;
  svgIcon: string;
  color: string;
}

const KEY = 'demleme-cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1) {
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  saveCart(cart);
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter(c => c.id !== id));
}

export function updateQty(id: string, qty: number) {
  if (qty <= 0) { removeFromCart(id); return; }
  const cart = getCart();
  const item = cart.find(c => c.id === id);
  if (item) { item.qty = qty; saveCart(cart); }
}

export function clearCart() {
  saveCart([]);
}

export function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
}

export function cartCount(cart: CartItem[]) {
  return cart.reduce((sum, c) => sum + c.qty, 0);
}

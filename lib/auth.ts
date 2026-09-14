export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: {
    id: string;
    name: string;
    price: number;
    qty: number;
    svgIcon: string;
    color: string;
  }[];
  total: number;
  shipping: number;
  address: Address;
  status: 'hazırlanıyor' | 'kargoda' | 'teslim edildi';
  createdAt: string;
}

export interface Address {
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  zip: string;
}

const USER_KEY = 'demleme-user';
const ORDERS_KEY = 'demleme-orders';

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}

export function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('auth-updated'));
}

export function logout() {
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('auth-updated'));
}

export function register(name: string, email: string, _password: string): User {
  const user: User = { id: Date.now().toString(), name, email, createdAt: new Date().toISOString() };
  setUser(user);
  return user;
}

export function login(email: string, _password: string): User | null {
  // Demo: her zaman başarılı, email'den isim üret
  const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const user: User = { id: Date.now().toString(), name, email, createdAt: new Date().toISOString() };
  setUser(user);
  return user;
}

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { return []; }
}

export function saveOrder(order: Order) {
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function createOrder(
  items: Order['items'],
  address: Address,
  total: number,
  shipping: number
): Order {
  const user = getUser();
  const order: Order = {
    id: 'DML-' + Date.now().toString().slice(-6),
    userId: user?.id || 'guest',
    items, total, shipping, address,
    status: 'hazırlanıyor',
    createdAt: new Date().toISOString(),
  };
  saveOrder(order);
  return order;
}

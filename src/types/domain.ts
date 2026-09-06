export type Role = 'customer' | 'merchant' | 'driver' | 'admin';

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  address: string | null;
  delivery_fee: number;
  is_open: boolean;
  prep_minutes: number;
  rating: number;
};

export type MenuItem = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  category: string | null;
  is_available: boolean;
};

export type Order = {
  id: string;
  customer_id: string;
  store_id: string;
  driver_id: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  delivery_address: string;
  customer_note: string | null;
  created_at: string;
};

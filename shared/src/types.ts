import { OrderStatusType } from "./orderStatus";

export interface RestaurantDTO {
  id: string;
  name: string;
  description?: string | null;
  city: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  rating: number;
}

export interface MenuItemDTO {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  category?: string | null;
}

export interface RestaurantWithMenuDTO extends RestaurantDTO {
  menuItems: MenuItemDTO[];
}

export interface AddressDTO {
  id: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem?: MenuItemDTO;
}

export interface OrderDTO {
  id: string;
  status: OrderStatusType;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  restaurant?: { id: string; name: string };
  driver?: { id: string } | null;
  address?: AddressDTO;
  items: OrderItemDTO[];
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

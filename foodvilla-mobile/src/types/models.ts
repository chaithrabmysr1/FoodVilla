// Mirrors backend JSON shapes exactly (see foodVilla_backend/*/dto). Kept in
// sync by hand, same convention the backend services themselves use for
// their own cross-service DTO copies — no shared schema package.

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  rating: number;
  deliveryTime: string;
  address: string;
  imageUrl: string;
  costForTwo: number;
  isOpen: boolean;
}

export interface FoodItem {
  id: number;
  itemName: string;
  itemDescription: string;
  isVeg: boolean;
  price: number;
  imageUrl: string;
  restaurantId: number;
  quantity: number | null;
}

// The restaurant shape nested inside GET /api/catalogue/{restaurantId} is
// narrower than the full Restaurant (no isOpen/costForTwo) — see
// foodcatalogue-service's own RestaurantDTO.
export interface CatalogueRestaurant {
  id: number;
  name: string;
  description: string;
  rating: number;
  deliveryTime: string;
  address: string;
  imageUrl: string;
}

export interface CatalogueResponse {
  restaurant: CatalogueRestaurant;
  foodItems: FoodItem[];
}

export interface LoginResponse {
  token: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  role: "USER" | "ADMIN";
  message: string;
}

export interface AuthUser {
  fullName: string;
  phoneNumber: string;
  address: string;
  role: "USER" | "ADMIN";
  email: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
}

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  label?: string;
}

export type OrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "RESTAURANT_PENDING"
  | "RESTAURANT_ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "DELIVERY_PARTNER_ASSIGNED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface OrderItem {
  foodItemId: number;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  note: string | null;
}

export interface Order {
  id: number;
  userId: number;
  customerEmail: string;
  restaurantId: number;
  restaurantName: string;
  deliveryPartnerId: number | null;
  items: OrderItem[];
  subtotalAmount: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddress: DeliveryAddress;
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemRequest {
  foodItemId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  restaurantId: number;
  items: CreateOrderItemRequest[];
  deliveryAddress: DeliveryAddress;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export type PaymentProviderType = "MOCK" | "RAZORPAY";
export type PaymentTxnStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
  providerOrderId: string;
  status: PaymentTxnStatus;
  failureReason: string | null;
  razorpayKeyId: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  orderId: number | null;
  read: boolean;
  createdAt: string;
}

export interface PublicDeliveryPartner {
  id: number;
  name: string;
  phone: string;
  vehicleType: string | null;
}

// Cart items keep enough info to render themselves without a network round
// trip (name/price/image snapshot at add-to-cart time) — the authoritative
// price is always re-fetched server-side when the order is actually created.
export interface CartItem {
  id: number; // foodItemId
  itemName: string;
  price: number;
  imageUrl: string;
  isVeg: boolean;
  restaurantId: number;
  restaurantName: string;
  quantity: number;
}

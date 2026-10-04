import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrencyCode, ProductType } from './restaurant-owner-data.service';

export type OrderStatus =
  | 'CREATED'
  | 'WAITING_RESTAURANT_VALIDATION'
  | 'ACCEPTED_BY_RESTAURANT'
  | 'REJECTED_BY_RESTAURANT'
  | 'AVAILABLE_FOR_RIDER'
  | 'RIDER_ASSIGNED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'EN_ROUTE'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type WorkflowOrderItem = {
  id?: string;
  menuItemId?: string | null;
  menuPackageId?: string | null;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  itemNameSnapshot?: string;
};

export type WorkflowOrder = {
  id: string;
  status: OrderStatus;
  clientId: string;
  restaurantId: string;
  riderId?: string | null;
  deliveryAddress: string;
  clientLatitude: number;
  clientLongitude: number;
  restaurantLatitude: number;
  restaurantLongitude: number;
  riderLastLatitude?: number | null;
  riderLastLongitude?: number | null;
  distanceRestaurantClientKm: number;
  totalAmount: number;
  items: WorkflowOrderItem[];
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
};

export type WorkflowHistoryEntry = {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedByRole?: string | null;
  reason?: string | null;
  changedAt: string;
};

export type WorkflowTracking = {
  orderId: string;
  status: OrderStatus;
  restaurant: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  client: {
    id: string;
    fullName: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  rider?: {
    id: string;
    fullName: string;
    latitude: number;
    longitude: number;
  } | null;
  distanceRestaurantClientKm: number;
  distanceRiderRestaurantKm?: number | null;
  distanceRiderClientKm?: number | null;
  estimatedDeliveryTimeMinutes: number;
};

export type PublicMenuProduct = {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  currency: CurrencyCode;
  description: string;
  available: boolean;
};

export type PublicMenuPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  products: PublicMenuProduct[];
  available: boolean;
};

export type PublicRestaurantMenu = {
  products: PublicMenuProduct[];
  menus: PublicMenuPackage[];
};

export type CreateWorkflowOrderRequest = {
  restaurantId: string;
  deliveryAddress: string;
  clientLatitude: number;
  clientLongitude: number;
  items: Array<{
    dishId: string | null;
    menuPackageId: string | null;
    quantity: number;
  }>;
};

@Injectable({
  providedIn: 'root',
})
export class OrderWorkflowService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  getRestaurantMenu(restaurantId: string | number): Observable<PublicRestaurantMenu> {
    return this.http
      .get<unknown>(`${this.apiBaseUrl}/api/public/restaurants/${restaurantId}/menu`)
      .pipe(map((response) => this.normalizeRestaurantMenu(response)));
  }

  createOrder(payload: CreateWorkflowOrderRequest): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/orders`, payload);
  }

  getMyOrders(): Observable<WorkflowOrder[]> {
    return this.http.get<WorkflowOrder[]>(`${this.apiBaseUrl}/api/orders/my`);
  }

  getTracking(orderId: string): Observable<WorkflowTracking> {
    return this.http.get<WorkflowTracking>(`${this.apiBaseUrl}/api/orders/${orderId}/tracking`);
  }

  getHistory(orderId: string): Observable<WorkflowHistoryEntry[]> {
    return this.http.get<WorkflowHistoryEntry[]>(`${this.apiBaseUrl}/api/orders/${orderId}/history`);
  }

  cancelCustomerOrder(orderId: string, reason = 'Cancelled by customer'): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/orders/${orderId}/cancel`, { reason });
  }

  getRestaurantOwnerOrders(): Observable<WorkflowOrder[]> {
    return this.http.get<WorkflowOrder[]>(`${this.apiBaseUrl}/api/restaurant-owner/orders`);
  }

  acceptRestaurantOrder(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/restaurant-owner/orders/${orderId}/accept`, {
      reason: 'Accepted from owner app',
    });
  }

  refuseRestaurantOrder(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/restaurant-owner/orders/${orderId}/refuse`, {
      reason: 'Rejected from owner app',
    });
  }

  markRestaurantOrderReady(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/restaurant-owner/orders/${orderId}/ready`, {
      reason: 'Ready for pickup from owner app',
    });
  }

  getAvailableRiderOrders(latitude: number, longitude: number, radiusKm = 20): Observable<WorkflowOrder[]> {
    return this.http.get<WorkflowOrder[]>(`${this.apiBaseUrl}/api/rider/orders/available`, {
      params: { latitude, longitude, radiusKm },
    });
  }

  getMyRiderOrders(): Observable<WorkflowOrder[]> {
    return this.http.get<WorkflowOrder[]>(`${this.apiBaseUrl}/api/rider/orders/my`);
  }

  updateRiderLocation(latitude: number, longitude: number): Observable<unknown> {
    return this.http.patch(`${this.apiBaseUrl}/api/rider/location`, { latitude, longitude });
  }

  acceptRiderOrder(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/rider/orders/${orderId}/accept`, {});
  }

  markPickedUp(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/rider/orders/${orderId}/picked-up`, {});
  }

  markEnRoute(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/rider/orders/${orderId}/en-route`, {});
  }

  markDelivered(orderId: string): Observable<WorkflowOrder> {
    return this.http.post<WorkflowOrder>(`${this.apiBaseUrl}/api/rider/orders/${orderId}/delivered`, {});
  }

  statusLabel(status: OrderStatus): string {
    return {
      CREATED: 'Creee',
      WAITING_RESTAURANT_VALIDATION: 'En attente restaurant',
      ACCEPTED_BY_RESTAURANT: 'Acceptee',
      REJECTED_BY_RESTAURANT: 'Refusee',
      AVAILABLE_FOR_RIDER: 'Disponible rider',
      RIDER_ASSIGNED: 'Rider assigne',
      READY_FOR_PICKUP: 'Prete',
      PICKED_UP: 'Recuperee',
      EN_ROUTE: 'En livraison',
      DELIVERED: 'Livree',
      CANCELLED: 'Annulee',
      FAILED: 'Echouee',
    }[status];
  }

  private normalizeRestaurantMenu(response: unknown): PublicRestaurantMenu {
    const record = this.isRecord(response) ? response : {};
    const categoryRows: unknown[] = Array.isArray(record['categories']) ? record['categories'] : [];
    const products: PublicMenuProduct[] = categoryRows.reduce<PublicMenuProduct[]>(
      (items, categoryRow) => [...items, ...this.normalizeCategoryProducts(categoryRow)],
      [],
    );
    const productsById = new Map<string, PublicMenuProduct>(products.map((product) => [product.id, product]));
    const menuRows = Array.isArray(record['menuPackages']) ? record['menuPackages'] : [];
    const menus = menuRows
      .filter((menu): menu is Record<string, unknown> => this.isRecord(menu))
      .map((menu) => this.normalizeMenuPackage(menu, productsById))
      .filter((menu) => menu.available);

    return {
      products: products.filter((product) => product.available),
      menus,
    };
  }

  private normalizeCategoryProducts(categoryRow: unknown): PublicMenuProduct[] {
    if (!this.isRecord(categoryRow)) {
      return [];
    }

    const category = this.isRecord(categoryRow['category']) ? categoryRow['category'] : {};
    const type = this.productTypeFromText(this.readString(category['name']) ?? '');
    const items = Array.isArray(categoryRow['items']) ? categoryRow['items'] : [];

    return items
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => ({
        id: this.readString(item['id']) ?? '',
        name: this.readString(item['name']) ?? 'Produit',
        type,
        price: this.readNumber(item['price']),
        currency: this.readCurrency(item['currency']),
        description: this.readString(item['description']) ?? '',
        available: this.readBoolean(item['available'], true) && this.readBoolean(item['active'], true),
      }))
      .filter((item) => item.id);
  }

  private normalizeMenuPackage(
    menu: Record<string, unknown>,
    productsById: Map<string, PublicMenuProduct>,
  ): PublicMenuPackage {
    const itemRows = Array.isArray(menu['items']) ? menu['items'] : [];
    const products = itemRows
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => this.readString(item['menuItemId']))
      .filter((id): id is string => Boolean(id))
      .map((id) => productsById.get(id))
      .filter((product): product is PublicMenuProduct => Boolean(product));

    return {
      id: this.readString(menu['id']) ?? '',
      name: this.readString(menu['name']) ?? 'Menu',
      description: this.readString(menu['description']) ?? '',
      price: this.readNumber(menu['price']),
      currency: this.readCurrency(menu['currency']),
      products,
      available: this.readBoolean(menu['available'], true) && this.readBoolean(menu['active'], true),
    };
  }

  private productTypeFromText(value: string): ProductType {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (normalized.includes('dessert')) {
      return 'DESSERT';
    }
    if (normalized.includes('drink') || normalized.includes('boisson')) {
      return 'DRINK';
    }
    if (normalized.includes('starter') || normalized.includes('entree')) {
      return 'STARTER';
    }

    return 'MAIN';
  }

  private readCurrency(value: unknown): CurrencyCode {
    return value === 'USD' || value === 'TND' ? value : 'EUR';
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

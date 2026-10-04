import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegisterAddressPayload } from '../core/services/auth.service';

export type ProductType = 'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK';
export type CurrencyCode = 'EUR' | 'USD' | 'TND';
export type RestaurantStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export type RestaurantOwnerProfile = {
  id: string;
  role: 'RESTAURANT_OWNER';
  firstName: string;
  lastName: string;
  email: string;
};

export type CurrencyOption = {
  code: CurrencyCode;
  label: string;
  symbol: string;
};

export const RESTAURANT_OWNER_CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', label: 'Euro', symbol: 'EUR' },
  { code: 'USD', label: 'Dollar', symbol: 'USD' },
  { code: 'TND', label: 'Dinar tunisien', symbol: 'TND' },
];

export type RestaurantProduct = {
  id: string;
  restaurantId: string;
  name: string;
  type?: ProductType;
  price: number;
  currency: CurrencyCode;
  available: boolean;
  image?: string;
  description?: string;
};

export type RestaurantMenu = {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  productIds: string[];
  price: number;
  totalPrice?: number;
  currency: CurrencyCode;
};

export type OwnerRestaurant = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  status: RestaurantStatus;
  openingHours: string;
  staffCount?: number;
  phone?: string;
  image: string;
  address: string;
  addressDetails?: RegisterAddressPayload;
  products: RestaurantProduct[];
  menus: RestaurantMenu[];
};

export type RestaurantOwnerDashboardResponse = {
  restaurants: OwnerRestaurant[];
};

export type RestaurantCreateRequest = {
  name: string;
  description: string;
  address: string;
  addressDetails: RegisterAddressPayload;
  openingHours: string;
  category: string;
  image: string;
  status: RestaurantStatus;
};

export type RestaurantUpdateRequest = RestaurantCreateRequest;

export type ProductCreateRequest = {
  name: string;
  type: ProductType;
  price: number;
  currency: CurrencyCode;
  available: boolean;
};

export type ProductUpdateRequest = ProductCreateRequest;

export type MenuCreateRequest = {
  name: string;
  price: number;
  currency: CurrencyCode;
  productIds: string[];
};

export type MenuUpdateRequest = MenuCreateRequest;

@Injectable({
  providedIn: 'root',
})
export class RestaurantOwnerDataService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  getDashboard(): Observable<RestaurantOwnerDashboardResponse> {
    return this.http.get<RestaurantOwnerDashboardResponse>(`${this.apiBaseUrl}/api/restaurant-owner/dashboard`);
  }

  createRestaurant(payload: RestaurantCreateRequest): Observable<OwnerRestaurant> {
    return this.http.post<OwnerRestaurant>(`${this.apiBaseUrl}/api/restaurants`, payload);
  }

  updateRestaurant(restaurantId: string, payload: RestaurantUpdateRequest): Observable<OwnerRestaurant> {
    return this.http.put<OwnerRestaurant>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}`, payload);
  }

  deleteRestaurant(restaurantId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}`);
  }

  createProduct(restaurantId: string, payload: ProductCreateRequest): Observable<RestaurantProduct> {
    return this.http.post<RestaurantProduct>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}/products`, payload);
  }

  updateProduct(restaurantId: string, productId: string, payload: ProductUpdateRequest): Observable<RestaurantProduct> {
    return this.http.put<RestaurantProduct>(
      `${this.apiBaseUrl}/api/restaurants/${restaurantId}/products/${productId}`,
      payload,
    );
  }

  deleteProduct(restaurantId: string, productId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}/products/${productId}`);
  }

  createMenu(restaurantId: string, payload: MenuCreateRequest): Observable<RestaurantMenu> {
    return this.http.post<RestaurantMenu>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}/menus`, payload);
  }

  updateMenu(restaurantId: string, menuId: string, payload: MenuUpdateRequest): Observable<RestaurantMenu> {
    return this.http.put<RestaurantMenu>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}/menus/${menuId}`, payload);
  }

  deleteMenu(restaurantId: string, menuId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/restaurants/${restaurantId}/menus/${menuId}`);
  }
}

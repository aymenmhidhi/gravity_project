import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegisterAddressPayload } from '../core/services/auth.service';

export type Category = {
  id: string;
  label: string;
  icon: string;
};

export type Restaurant = {
  id: number | string;
  name: string;
  categoryId: string;
  rating: string;
  reviews: string;
  kind: string;
  priceLevel: string;
  fee: string;
  eta: string;
  initials: string;
  image: string;
  address: string;
};

export type HomeData = {
  categories: Category[];
  restaurants: Restaurant[];
};

export const HOME_RESTAURANT_CATEGORIES: Category[] = [
  { id: 'all', label: 'Tous', icon: 'grid-outline' },
  { id: 'italien', label: 'Italien', icon: 'restaurant-outline' },
  { id: 'burger', label: 'Burger', icon: 'fast-food-outline' },
  { id: 'sushi', label: 'Sushi', icon: 'fish-outline' },
  { id: 'pizza', label: 'Pizza', icon: 'pizza-outline' },
  { id: 'kebab', label: 'Kebab', icon: 'restaurant-outline' },
  { id: 'healthy', label: 'Healthy', icon: 'leaf-outline' },
  { id: 'dessert', label: 'Dessert', icon: 'ice-cream-outline' },
  { id: 'boisson', label: 'Boisson', icon: 'cafe-outline' },
  { id: 'libanais', label: 'Libanais', icon: 'leaf-outline' },
  { id: 'tunisien', label: 'Tunisien', icon: 'sunny-outline' },
  { id: 'marocain', label: 'Marocain', icon: 'storefront-outline' },
  { id: 'thailandais', label: 'Thailandais', icon: 'flower-outline' },
  { id: 'mexicain', label: 'Mexicain', icon: 'flame-outline' },
  { id: 'indien', label: 'Indien', icon: 'nutrition-outline' },
  { id: 'chinois', label: 'Chinois', icon: 'restaurant-outline' },
  { id: 'tacos', label: 'Tacos', icon: 'fast-food-outline' },
  { id: 'sandwich', label: 'Sandwich', icon: 'fast-food-outline' },
];

export const RESTAURANT_CREATION_CATEGORIES: Category[] = HOME_RESTAURANT_CATEGORIES.filter(
  (category) => category.id !== 'all',
);

const CATEGORY_ICON_BY_ID: Record<string, string> = HOME_RESTAURANT_CATEGORIES.reduce(
  (icons, category) => ({
    ...icons,
    [category.id]: category.icon,
  }),
  {} as Record<string, string>,
);

@Injectable({
  providedIn: 'root',
})
export class HomeDataService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly publicRestaurantsUrl = `${this.apiBaseUrl}/api/public/restaurants`;
  private readonly nearbyRestaurantsUrl = `${this.apiBaseUrl}/api/restaurants/search`;
  private readonly defaultRadiusKm = 10;

  getHomeData(): Observable<HomeData> {
    return this.http.get<unknown>(this.publicRestaurantsUrl).pipe(
      map((response) => {
        const restaurants = this.normalizeRestaurants(response);

        return {
          categories: this.getRestaurantCategories(restaurants),
          restaurants,
        };
      }),
      catchError(() =>
        of({
          categories: HOME_RESTAURANT_CATEGORIES,
          restaurants: [],
        }),
      ),
    );
  }

  getHomeDataForAddress(
    addressDetails?: Partial<RegisterAddressPayload>,
    isConnected = false,
  ): Observable<HomeData> {
    if (!isConnected) {
      return this.getHomeData();
    }

    const position = this.getSearchPosition(addressDetails);

    if (!position) {
      return this.getHomeData();
    }

    return this.getNearbyRestaurants(position.latitude, position.longitude).pipe(
      map((restaurants) => ({
        categories: HOME_RESTAURANT_CATEGORIES,
        restaurants,
      })),
      catchError(() => this.getHomeData()),
    );
  }

  getNearbyRestaurants(latitude: number, longitude: number, radiusKm = this.defaultRadiusKm): Observable<Restaurant[]> {
    return this.http
      .get<unknown>(this.nearbyRestaurantsUrl, {
        params: {
          latitude,
          longitude,
          radiusKm,
        },
      })
      .pipe(map((response) => this.normalizeRestaurants(response)));
  }

  getRestaurantsByCategory(categoryId: string): Observable<Restaurant[]> {
    return of(this.filterRestaurants([], categoryId));
  }

  filterRestaurants(restaurants: Restaurant[], categoryIds: string | string[]): Restaurant[] {
    const selectedCategoryIds = Array.isArray(categoryIds)
      ? categoryIds.filter((categoryId) => categoryId !== 'all')
      : categoryIds === 'all'
        ? []
        : [categoryIds];

    if (!selectedCategoryIds.length) {
      return restaurants;
    }

    return restaurants.filter((restaurant) => {
      const restaurantTypeIds = new Set([restaurant.categoryId, this.toCategoryId(restaurant.kind)]);

      return selectedCategoryIds.some((categoryId) => restaurantTypeIds.has(categoryId));
    });
  }

  getRestaurantCategories(restaurants: Restaurant[], baseCategories: Category[] = HOME_RESTAURANT_CATEGORIES): Category[] {
    const categoriesById = new Map<string, Category>();

    baseCategories.forEach((category) => {
      categoriesById.set(category.id, category);
    });

    restaurants.forEach((restaurant) => {
      const categoryId = restaurant.categoryId === 'all' ? this.toCategoryId(restaurant.kind) : restaurant.categoryId;

      if (!categoryId || categoryId === 'all' || categoriesById.has(categoryId)) {
        return;
      }

      categoriesById.set(categoryId, {
        id: categoryId,
        label: this.toCategoryLabel(restaurant.kind, categoryId),
        icon: CATEGORY_ICON_BY_ID[categoryId] ?? 'restaurant-outline',
      });
    });

    const allCategory = categoriesById.get('all') ?? { id: 'all', label: 'Tous', icon: 'grid-outline' };
    categoriesById.delete('all');

    return [allCategory, ...Array.from(categoriesById.values())];
  }

  getRestaurantCategoryIcon(restaurant: Restaurant): string {
    const categoryId = restaurant.categoryId === 'all' ? this.toCategoryId(restaurant.kind) : restaurant.categoryId;

    return CATEGORY_ICON_BY_ID[categoryId] ?? 'restaurant-outline';
  }

  getRestaurantCategoryLabel(restaurant: Restaurant): string {
    const categoryId = restaurant.categoryId === 'all' ? this.toCategoryId(restaurant.kind) : restaurant.categoryId;

    return HOME_RESTAURANT_CATEGORIES.find((category) => category.id === categoryId)?.label ?? restaurant.kind;
  }

  private getSearchPosition(addressDetails?: Partial<RegisterAddressPayload>): { latitude: number; longitude: number } | null {
    if (typeof addressDetails?.latitude === 'number' && typeof addressDetails.longitude === 'number') {
      return {
        latitude: addressDetails.latitude,
        longitude: addressDetails.longitude,
      };
    }

    return null;
  }

  private normalizeRestaurants(response: unknown): Restaurant[] {
    const restaurants = Array.isArray(response)
      ? response
      : this.isRecord(response) && Array.isArray(response['restaurants'])
        ? response['restaurants']
        : this.isRecord(response) && Array.isArray(response['data'])
          ? response['data']
          : this.isRecord(response) && Array.isArray(response['content'])
            ? response['content']
            : [];

    return restaurants
      .filter((restaurant): restaurant is Record<string, unknown> => this.isRecord(restaurant))
      .map((restaurant) => this.normalizeRestaurant(restaurant));
  }

  private normalizeRestaurant(restaurant: Record<string, unknown>): Restaurant {
    const name = this.readString(restaurant['name']) ?? 'Restaurant';
    const category =
      this.readString(
        restaurant['category'] ??
          restaurant['kind'] ??
          restaurant['type'] ??
          restaurant['cuisine'] ??
          restaurant['cuisineType'] ??
          restaurant['cuisine_type'] ??
          restaurant['restaurantType'] ??
          restaurant['restaurant_type'],
      ) ?? 'Restaurant';
    const categoryId = this.readString(restaurant['categoryId'] ?? restaurant['category_id']);

    return {
      id: this.readString(restaurant['id']) ?? name,
      name,
      categoryId: categoryId ? this.toCategoryId(categoryId) : this.toCategoryId(category),
      rating: this.readString(restaurant['rating']) ?? this.readString(restaurant['averageRating']) ?? 'Non note',
      reviews: this.readString(restaurant['reviews'] ?? restaurant['reviewCount'] ?? restaurant['reviewsCount']) ?? '0 avis',
      kind: category,
      priceLevel: this.readString(restaurant['priceLevel'] ?? restaurant['price_level']) ?? 'Prix non indique',
      fee: this.formatFee(restaurant['fee'] ?? restaurant['deliveryFee'] ?? restaurant['delivery_fee']),
      eta: this.formatEta(restaurant['eta'] ?? restaurant['deliveryTime'] ?? restaurant['delivery_time']),
      initials: this.createInitials(name),
      image: this.readString(restaurant['image'] ?? restaurant['imageUrl'] ?? restaurant['image_url']) ?? '',
      address: this.formatRestaurantAddress(restaurant),
    };
  }

  private toCategoryId(category: string): string {
    const normalized = category
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalized.includes('italien') || normalized.includes('italian')) {
      return 'italien';
    }

    if (normalized.includes('burger')) {
      return 'burger';
    }

    if (normalized.includes('sushi') || normalized.includes('japon') || normalized.includes('japan')) {
      return 'sushi';
    }

    if (normalized.includes('pizza')) {
      return 'pizza';
    }

    if (normalized.includes('kebab')) {
      return 'kebab';
    }

    if (normalized.includes('healthy') || normalized.includes('nutrition')) {
      return 'healthy';
    }

    if (normalized.includes('dessert')) {
      return 'dessert';
    }

    if (normalized.includes('boisson') || normalized.includes('drink') || normalized.includes('cafe')) {
      return 'boisson';
    }

    if (normalized.includes('liban') || normalized.includes('leban')) {
      return 'libanais';
    }

    if (normalized.includes('tunis')) {
      return 'tunisien';
    }

    if (normalized.includes('maroc')) {
      return 'marocain';
    }

    if (normalized.includes('thai') || normalized.includes('thailand')) {
      return 'thailandais';
    }

    if (normalized.includes('mexic')) {
      return 'mexicain';
    }

    if (normalized.includes('indien') || normalized.includes('indian')) {
      return 'indien';
    }

    if (normalized.includes('chinois') || normalized.includes('chine') || normalized.includes('china')) {
      return 'chinois';
    }

    if (normalized.includes('tacos')) {
      return 'tacos';
    }

    if (normalized.includes('sandwich')) {
      return 'sandwich';
    }

    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all';
  }

  private toCategoryLabel(kind: string, categoryId: string): string {
    const label = kind.trim() || categoryId.replace(/-/g, ' ');

    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private createInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private formatFee(value: unknown): string {
    const fee = this.readString(value);

    if (fee) {
      return fee;
    }

    return typeof value === 'number' ? `Frais ${value.toFixed(2).replace('.', ',')} EUR` : 'Frais selon distance';
  }

  private formatEta(value: unknown): string {
    const eta = this.readString(value);

    if (eta) {
      return eta.toLowerCase().includes('livraison') ? eta : `Livraison ${eta}`;
    }

    return typeof value === 'number' ? `Livraison ${value} min` : 'Livraison selon distance';
  }

  private formatRestaurantAddress(restaurant: Record<string, unknown>): string {
    const directAddress = this.readString(
      restaurant['address'] ??
        restaurant['addressLabel'] ??
        restaurant['address_label'] ??
        restaurant['fullAddress'] ??
        restaurant['full_address'],
    );

    if (directAddress) {
      return directAddress;
    }

    const addressDetails =
      restaurant['address'] ??
      restaurant['addressDetails'] ??
      restaurant['address_details'] ??
      restaurant['location'] ??
      restaurant['defaultAddress'] ??
      restaurant['default_address'];

    if (this.isRecord(addressDetails)) {
      return this.formatAddressDetails(addressDetails) || 'Adresse non disponible';
    }

    return this.formatAddressDetails(restaurant) || 'Adresse non disponible';
  }

  private formatAddressDetails(addressDetails: Record<string, unknown>): string {
    const line1 = this.readString(
      addressDetails['line1'] ??
        addressDetails['street'] ??
        addressDetails['streetAddress'] ??
        addressDetails['street_address'],
    );
    const postalCode = this.readString(
      addressDetails['postalCode'] ?? addressDetails['postal_code'] ?? addressDetails['zipCode'] ?? addressDetails['zip_code'],
    );
    const city = this.readString(addressDetails['city'] ?? addressDetails['locality']);
    const country = this.readString(addressDetails['country']);
    const cityLine = [postalCode, city].filter(Boolean).join(' ');

    return [line1, cityLine, country].filter(Boolean).join(', ');
  }

  private readString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

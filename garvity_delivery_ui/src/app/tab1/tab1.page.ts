import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { addIcons } from 'ionicons';
import {
  bagAddOutline,
  cafeOutline,
  chevronDownOutline,
  chevronForwardOutline,
  fastFoodOutline,
  fishOutline,
  flashOutline,
  flameOutline,
  flowerOutline,
  gridOutline,
  heartOutline,
  iceCreamOutline,
  leafOutline,
  locationOutline,
  menuOutline,
  navigateOutline,
  nutritionOutline,
  notificationsOutline,
  optionsOutline,
  pizzaOutline,
  pricetagOutline,
  restaurantOutline,
  searchOutline,
  star,
  storefrontOutline,
  sunnyOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { TranslationService } from '../core/i18n/translation.service';
import { AddressLookupService } from '../core/services/address-lookup.service';
import { AuthService, AuthUser, RegisterAddressPayload } from '../core/services/auth.service';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher.component';
import { Category, HOME_RESTAURANT_CATEGORIES, HomeDataService, Restaurant } from '../services/home-data.service';
import { CustomerOrderService } from '../services/customer-order.service';

type MapStop = {
  code: string;
  label: string;
  detail: string;
  position: [number, number];
  markerClass: 'home' | 'restaurant' | 'courier' | 'user';
};

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, IonIcon, LanguageSwitcherComponent],
})
export class Tab1Page implements AfterViewInit, OnDestroy, OnInit {
  private readonly homeDataService = inject(HomeDataService);
  private readonly addressLookupService = inject(AddressLookupService);
  private readonly authService = inject(AuthService);
  private readonly customerOrderService = inject(CustomerOrderService);
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);

  @ViewChild('deliveryMap') private readonly deliveryMap?: ElementRef<HTMLElement>;

  categories: Category[] = [];
  restaurants: Restaurant[] = [];
  filteredRestaurants: Restaurant[] = [];
  selectedCategoryIds: string[] = [];
  searchQuery = '';
  deliveryAddress = '';
  deliveryAddressDetails?: Partial<RegisterAddressPayload>;
  mapStatus = 'Adresse client';
  routeSummary = 'Adresse client';
  readonly storyImages = [
    {
      image: 'assets/gravity/hero-drone-v2.png',
      alt: 'Gravity drone',
    },
    {
      image: 'assets/gravity/burger-card-v2.png',
      alt: 'Burger House',
    },
    {
      image: 'assets/gravity/sushi-card-v2.png',
      alt: 'Sushi Daily',
    },
    {
      image: 'assets/gravity/bella-pizza.png',
      alt: 'Bella Pizza',
    },
  ];
  mapStops: MapStop[] = [
    {
      code: 'VO',
      label: 'Adresse client',
      detail: 'Adresse client non disponible',
      position: [46.6034, 1.8883],
      markerClass: 'home',
    },
  ];

  private readonly fallbackCustomerPosition: [number, number] = [46.6034, 1.8883];
  private map?: L.Map;
  private routeLayer?: L.Polyline;
  private userRouteLayer?: L.Polyline;
  private markerLayer?: L.LayerGroup;
  private lastRestaurantSearchKey = '';

  get displayedDeliveryAddress(): string {
    return this.deliveryAddress || 'Adresse client non disponible';
  }

  constructor() {
    addIcons({
      bagAddOutline,
      cafeOutline,
      chevronDownOutline,
      chevronForwardOutline,
      fastFoodOutline,
      fishOutline,
      flashOutline,
      flameOutline,
      flowerOutline,
      gridOutline,
      heartOutline,
      iceCreamOutline,
      leafOutline,
      locationOutline,
      menuOutline,
      navigateOutline,
      nutritionOutline,
      notificationsOutline,
      optionsOutline,
      pizzaOutline,
      pricetagOutline,
      restaurantOutline,
      searchOutline,
      star,
      storefrontOutline,
      sunnyOutline,
      checkmarkCircle,
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.setTimeout(() => this.initializeMap(), 0);
    });
  }

  ngOnInit(): void {
    this.refreshCurrentUserContext();
  }

  ionViewWillEnter(): void {
    this.refreshCurrentUserContext();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private refreshCurrentUserContext(): void {
    this.authService.getCurrentUser().subscribe((user) => {
      this.applyUserAddress(user);

      const addressPosition = this.getAddressPosition();

      if (addressPosition) {
        this.loadHomeDataForPosition(addressPosition);
      } else if (this.deliveryAddress.trim()) {
        this.loadHomeDataForGeocodedAddress();
      } else {
        this.loadHomeDataWithoutRestaurants();
      }
    });
  }

  selectCategory(categoryId: string): void {
    if (categoryId === 'all') {
      this.clearCategoryFilters();
      return;
    }

    this.toggleCategory(categoryId);
  }

  toggleCategory(categoryId: string): void {
    if (categoryId === 'all') {
      this.clearCategoryFilters();
      return;
    }

    this.selectedCategoryIds = this.selectedCategoryIds.includes(categoryId)
      ? this.selectedCategoryIds.filter((selectedCategoryId) => selectedCategoryId !== categoryId)
      : [...this.selectedCategoryIds, categoryId];

    this.applyRestaurantFilters();
  }

  clearCategoryFilters(): void {
    this.selectedCategoryIds = [];
    this.applyRestaurantFilters();
  }

  isCategorySelected(categoryId: string): boolean {
    return categoryId === 'all' ? this.selectedCategoryIds.length === 0 : this.selectedCategoryIds.includes(categoryId);
  }

  searchRestaurants(value: string): void {
    this.searchQuery = value;
    this.applyRestaurantFilters();
  }

  getRestaurantCategoryIcon(restaurant: Restaurant): string {
    return this.homeDataService.getRestaurantCategoryIcon(restaurant);
  }

  getRestaurantCategoryLabel(restaurant: Restaurant): string {
    return this.homeDataService.getRestaurantCategoryLabel(restaurant);
  }

  chooseRestaurant(restaurant: Restaurant): void {
    this.customerOrderService.selectRestaurant(restaurant);
    void this.router.navigate(['/tabs/cart']);
  }

  useCurrentPosition(): void {
    if (!navigator.geolocation) {
      this.mapStatus = 'Position indisponible';
      this.setAddressOnMap();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPosition: [number, number] = [position.coords.latitude, position.coords.longitude];

        this.ngZone.run(() => {
          this.mapStatus = 'Position actuelle';
          this.updateMapAroundCustomer(userPosition, 'Votre position', 'Position detectee par le navigateur', 'user');
          this.renderMapLayers();

          if (this.authService.isAuthenticated()) {
            this.loadHomeDataForPosition(userPosition);
          }
        });
      },
      () => {
        this.ngZone.run(() => {
          this.mapStatus = 'Position indisponible';
          this.setAddressOnMap();
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 8000,
      },
    );
  }

  setAddressOnMap(): void {
    this.mapStatus = 'Adresse client';

    const addressPosition = this.getAddressPosition();

    if (addressPosition) {
      this.updateMapAroundCustomer(addressPosition, 'Adresse client', this.displayedDeliveryAddress, 'home');
      this.renderMapLayers();
      this.loadRestaurantsForResolvedAddress(addressPosition);
      return;
    }

    if (!this.deliveryAddress.trim()) {
      this.updateMapAroundCustomer(
        this.fallbackCustomerPosition,
        'Adresse client',
        'Adresse client non disponible',
        'home',
      );
      this.renderMapLayers();
      return;
    }

    const requestedAddress = this.deliveryAddress;

    this.addressLookupService.searchFrenchAddresses(requestedAddress).subscribe((suggestions) => {
      if (requestedAddress !== this.deliveryAddress) {
        return;
      }

      const suggestion = suggestions.find((entry) => entry.latitude !== null && entry.longitude !== null);
      if (!suggestion) {
        this.updateMapAroundCustomer(this.fallbackCustomerPosition, 'Adresse client', this.displayedDeliveryAddress, 'home');
        this.renderMapLayers();
        return;
      }

      const position: [number, number] = [suggestion.latitude as number, suggestion.longitude as number];

      this.setResolvedAddressPosition(position);
      this.updateMapAroundCustomer(position, 'Adresse client', this.displayedDeliveryAddress, 'home');
      this.renderMapLayers();
      this.loadRestaurantsForResolvedAddress(position);
    });
  }

  private applyUserAddress(user: AuthUser | null): void {
    if (!user) {
      this.clearUserAddress();
      return;
    }

    this.clearUserAddress();
    this.deliveryAddressDetails = user.addressDetails;

    if (user.address?.trim()) {
      this.deliveryAddress = user.address.trim();
    } else {
      this.deliveryAddress = this.formatAddress(user.addressDetails);
    }

    this.setAddressOnMap();
  }

  private clearUserAddress(): void {
    this.deliveryAddress = '';
    this.deliveryAddressDetails = undefined;
  }

  private loadHomeDataForPosition(position: [number, number]): void {
    this.lastRestaurantSearchKey = this.createRestaurantSearchKey(position);

    this.homeDataService.getNearbyRestaurants(position[0], position[1]).subscribe({
      next: (restaurants) => {
        this.applyHomeData(HOME_RESTAURANT_CATEGORIES, restaurants);
      },
      error: () => {
        this.applyHomeData(HOME_RESTAURANT_CATEGORIES, []);
      },
    });
  }

  private loadHomeDataForGeocodedAddress(): void {
    const requestedAddress = this.deliveryAddress.trim();

    if (!requestedAddress) {
      this.loadHomeDataWithoutRestaurants();
      return;
    }

    this.addressLookupService.searchFrenchAddresses(requestedAddress).subscribe((suggestions) => {
      if (requestedAddress !== this.deliveryAddress.trim()) {
        return;
      }

      const suggestion = suggestions.find((entry) => entry.latitude !== null && entry.longitude !== null);

      if (!suggestion) {
        this.loadHomeDataWithoutRestaurants();
        return;
      }

      const position: [number, number] = [suggestion.latitude as number, suggestion.longitude as number];

      this.setResolvedAddressPosition(position);
      this.loadRestaurantsForResolvedAddress(position);
    });
  }

  private loadRestaurantsForResolvedAddress(position: [number, number]): void {
    const restaurantSearchKey = this.createRestaurantSearchKey(position);

    if (restaurantSearchKey === this.lastRestaurantSearchKey) {
      return;
    }

    this.loadHomeDataForPosition(position);
  }

  private loadHomeDataWithoutRestaurants(): void {
    this.homeDataService.getHomeData().subscribe((data) => {
      this.applyHomeData(data.categories, data.restaurants);
    });
  }

  private applyHomeData(categories: Category[], restaurants: Restaurant[]): void {
    this.categories = this.homeDataService.getRestaurantCategories(restaurants, categories);
    this.restaurants = restaurants;
    this.applyRestaurantFilters();
  }

  private getAddressPosition(): [number, number] | null {
    const latitude = this.deliveryAddressDetails?.latitude;
    const longitude = this.deliveryAddressDetails?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return null;
    }

    return this.isAddressPositionCoherent(latitude, longitude) ? [latitude, longitude] : null;
  }

  private setResolvedAddressPosition(position: [number, number]): void {
    this.deliveryAddressDetails = {
      ...this.deliveryAddressDetails,
      latitude: position[0],
      longitude: position[1],
    };
  }

  private createRestaurantSearchKey(position: [number, number]): string {
    return `${position[0]},${position[1]}`;
  }

  private isAddressPositionCoherent(latitude: number, longitude: number): boolean {
    if (!this.isTunisianAddress()) {
      return true;
    }

    return latitude >= 30 && latitude <= 38.5 && longitude >= 7 && longitude <= 12.5;
  }

  private isTunisianAddress(): boolean {
    const normalizedAddress = this.displayedDeliveryAddress
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return (
      normalizedAddress.includes('tunis') ||
      normalizedAddress.includes('tunisie') ||
      normalizedAddress.includes('tunisia')
    );
  }

  private formatAddress(addressDetails: Partial<RegisterAddressPayload> | undefined): string {
    if (!addressDetails) {
      return '';
    }

    const cityLine = [addressDetails.postalCode, addressDetails.city].filter(Boolean).join(' ');

    return [addressDetails.line1, cityLine, addressDetails.country].filter(Boolean).join(', ');
  }

  private updateMapAroundCustomer(
    customerPosition: [number, number],
    customerLabel: string,
    customerDetail: string,
    markerClass: 'home' | 'user',
  ): void {
    this.mapStops = [
      {
        code: markerClass === 'user' ? 'MOI' : 'CL',
        label: customerLabel,
        detail: customerDetail,
        position: customerPosition,
        markerClass,
      },
    ];
    this.routeSummary = this.createRouteSummary(customerPosition, customerPosition);
  }

  private offsetPosition(position: [number, number], offset: [number, number]): [number, number] {
    return [position[0] + offset[0], position[1] + offset[1]];
  }

  private createRouteSummary(from: [number, number], to: [number, number]): string {
    const distanceKm = this.getDistanceInKilometers(from, to);
    const etaMinutes = Math.max(12, Math.round(distanceKm * 6 + 8));
    const distanceText = distanceKm >= 10 ? `${Math.round(distanceKm)} km` : `${distanceKm.toFixed(1).replace('.', ',')} km`;

    return `${distanceText} · ${etaMinutes} min`;
  }

  private getDistanceInKilometers(from: [number, number], to: [number, number]): number {
    const earthRadiusKm = 6371;
    const latDelta = this.toRadians(to[0] - from[0]);
    const lngDelta = this.toRadians(to[1] - from[1]);
    const fromLat = this.toRadians(from[0]);
    const toLat = this.toRadians(to[0]);
    const haversine =
      Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private applyRestaurantFilters(): void {
    const normalizedQuery = this.searchQuery.trim().toLowerCase();
    const categoryRestaurants = this.homeDataService.filterRestaurants(this.restaurants, this.selectedCategoryIds);

    this.filteredRestaurants = normalizedQuery
      ? categoryRestaurants.filter((restaurant) =>
          [restaurant.name, restaurant.kind, restaurant.categoryId, this.getRestaurantCategoryLabel(restaurant)].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
        )
      : categoryRestaurants;
  }

  private initializeMap(): void {
    if (!this.deliveryMap || this.map) {
      return;
    }

    this.map = L.map(this.deliveryMap.nativeElement, {
      center: this.fallbackCustomerPosition,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.updateMapAroundCustomer(
      this.fallbackCustomerPosition,
      'Adresse client',
      'Adresse client non disponible',
      'home',
    );
    this.renderMapLayers();
    this.setAddressOnMap();
  }

  private renderMapLayers(): void {
    if (!this.map) {
      return;
    }

    this.routeLayer?.remove();
    this.userRouteLayer?.remove();
    this.markerLayer?.remove();

    const stops = [...this.mapStops];
    const bounds = L.latLngBounds(stops.map((stop) => stop.position));

    this.routeLayer = L.polyline(this.mapStops.map((stop) => stop.position), {
      color: '#8cff55',
      weight: 4,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(this.map);

    if (this.mapStops[1]) {
      this.userRouteLayer = L.polyline([this.mapStops[0].position, this.mapStops[1].position], {
        color: '#ffffff',
        dashArray: '8 10',
        weight: 2,
        opacity: 0.62,
      }).addTo(this.map);
    }

    this.markerLayer = L.layerGroup(
      stops.map((stop) =>
        L.marker(stop.position, {
          icon: L.divIcon({
            className: `gravity-map-marker ${stop.markerClass}`,
            html: stop.code,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
        }).bindPopup(`<strong class="map-popup-title">${stop.label}</strong><span>${stop.detail}</span>`, {
          className: 'gravity-map-popup',
          closeButton: false,
        }),
      ),
    ).addTo(this.map);

    this.map.fitBounds(bounds.pad(0.22), { animate: false });
    this.map.invalidateSize();
  }
}

import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  bagHandleOutline,
  calendarOutline,
  cafeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  createOutline,
  fastFoodOutline,
  fishOutline,
  flameOutline,
  flowerOutline,
  iceCreamOutline,
  leafOutline,
  locationOutline,
  nutritionOutline,
  pizzaOutline,
  receiptOutline,
  restaurantOutline,
  storefrontOutline,
  sunnyOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap } from 'rxjs';
import { AddressLookupService, AddressSuggestion } from '../../core/services/address-lookup.service';
import { RegisterAddressPayload } from '../../core/services/auth.service';
import {
  CurrencyCode,
  CurrencyOption,
  MenuCreateRequest,
  OwnerRestaurant,
  ProductCreateRequest,
  ProductType,
  RESTAURANT_OWNER_CURRENCIES,
  RestaurantCreateRequest,
  RestaurantMenu,
  RestaurantOwnerDataService,
  RestaurantProduct,
  RestaurantStatus,
} from '../../services/restaurant-owner-data.service';
import { RESTAURANT_CREATION_CATEGORIES } from '../../services/home-data.service';
import { OrderWorkflowService, WorkflowOrder } from '../../services/order-workflow.service';
import { RealtimeNotificationService } from '../../services/realtime-notification.service';

type RestaurantDraft = {
  id: string | null;
  name: string;
  description: string;
  address: string;
  selectedAddress: AddressSuggestion | null;
  addressDetails: RegisterAddressPayload | null;
  openingHours: string;
  category: string;
  image: string;
  status: RestaurantStatus;
};

type ProductDraft = {
  id: string | null;
  name: string;
  type: ProductType;
  price: number;
  currency: CurrencyCode;
  available: boolean;
};

type MenuDraft = {
  id: string | null;
  name: string;
  price: number;
  currency: CurrencyCode;
  productIds: string[];
};

type FormMode = 'hidden' | 'create' | 'edit';

type ProductTypeOption = {
  value: ProductType;
  label: string;
  icon: string;
};

type RestaurantCategoryOption = {
  value: string;
  label: string;
  icon: string;
};

@Component({
  selector: 'app-restaurant-owner',
  templateUrl: './restaurant-owner.page.html',
  styleUrls: ['./restaurant-owner.page.scss'],
  imports: [FormsModule, IonContent, IonIcon],
})
export class RestaurantOwnerPage implements OnInit {
  private readonly restaurantOwnerDataService = inject(RestaurantOwnerDataService);
  private readonly orderWorkflowService = inject(OrderWorkflowService);
  private readonly realtimeNotificationService = inject(RealtimeNotificationService);
  private readonly addressLookupService = inject(AddressLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly addressSearch$ = new Subject<string>();

  restaurants: OwnerRestaurant[] = [];
  restaurantOrders: WorkflowOrder[] = [];
  selectedRestaurant: OwnerRestaurant | null = null;
  currencies: CurrencyOption[] = [];
  addressSuggestions: AddressSuggestion[] = [];
  isSearchingAddress = false;
  restaurantFormMode: FormMode = 'hidden';
  productFormMode: FormMode = 'hidden';
  menuFormMode: FormMode = 'hidden';
  processingOrderIds = new Set<string>();
  message = '';

  restaurantDraft: RestaurantDraft = this.createRestaurantDraft();
  productDraft: ProductDraft = this.createProductDraft();
  menuDraft: MenuDraft = this.createMenuDraft();

  readonly restaurantCategories: RestaurantCategoryOption[] = RESTAURANT_CREATION_CATEGORIES.map((category) => ({
    value: category.label,
    label: category.label,
    icon: category.icon,
  }));
  readonly statuses: RestaurantStatus[] = ['OPEN', 'PAUSED', 'CLOSED'];
  readonly productTypes: ProductTypeOption[] = [
    { value: 'STARTER', label: 'Entree', icon: 'leaf-outline' },
    { value: 'MAIN', label: 'Plat', icon: 'restaurant-outline' },
    { value: 'DRINK', label: 'Boisson', icon: 'cafe-outline' },
    { value: 'DESSERT', label: 'Dessert', icon: 'ice-cream-outline' },
  ];
  readonly statusLabels: Record<RestaurantStatus, string> = {
    OPEN: 'Ouvert',
    PAUSED: 'En pause',
    CLOSED: 'Ferme',
  };

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      bagHandleOutline,
      calendarOutline,
      cafeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      createOutline,
      fastFoodOutline,
      fishOutline,
      flameOutline,
      flowerOutline,
      iceCreamOutline,
      leafOutline,
      locationOutline,
      nutritionOutline,
      pizzaOutline,
      receiptOutline,
      restaurantOutline,
      storefrontOutline,
      sunnyOutline,
      timeOutline,
      trashOutline,
    });

    this.addressSearch$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmedQuery = query.trim();

          if (trimmedQuery.length < 3) {
            this.isSearchingAddress = false;
            return of([]);
          }

          this.isSearchingAddress = true;

          return this.addressLookupService.searchFrenchAddresses(trimmedQuery).pipe(
            catchError(() => of([])),
            finalize(() => (this.isSearchingAddress = false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((suggestions) => {
        this.addressSuggestions = suggestions;
      });
  }

  ngOnInit(): void {
    this.currencies = RESTAURANT_OWNER_CURRENCIES;

    this.loadRestaurantOrders();

    this.restaurantOwnerDataService.getDashboard().subscribe((data) => {
      this.restaurants = data.restaurants.map((restaurant) => this.cloneRestaurant(restaurant));
      this.syncRoute();
    });

    this.route.paramMap.subscribe(() => this.syncRoute());

    this.realtimeNotificationService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if (notification.orderId) {
          this.loadRestaurantOrders();
          this.message = 'Nouvelle mise a jour commande recue.';
        }
      });
  }

  openRestaurant(restaurant: OwnerRestaurant): void {
    void this.router.navigate(['/tabs/restaurant-owner', restaurant.id]);
  }

  backToList(): void {
    this.selectedRestaurant = null;
    this.restaurantFormMode = 'hidden';
    this.productFormMode = 'hidden';
    this.menuFormMode = 'hidden';
    this.message = '';
    void this.router.navigate(['/tabs/restaurant-owner']);
  }

  startAddRestaurant(): void {
    this.selectedRestaurant = null;
    this.restaurantFormMode = 'create';
    this.restaurantDraft = this.createRestaurantDraft();
    this.addressSuggestions = [];
    void this.router.navigate(['/tabs/restaurant-owner', 'new']);
  }

  startEditRestaurant(restaurant: OwnerRestaurant, event?: Event): void {
    event?.stopPropagation();
    this.selectedRestaurant = restaurant;
    this.restaurantFormMode = 'edit';
    this.restaurantDraft = this.createRestaurantDraft(restaurant);
    this.addressSuggestions = [];
    void this.router.navigate(['/tabs/restaurant-owner', restaurant.id]);
  }

  saveRestaurant(): void {
    if (!this.restaurantDraft.name.trim() || !this.restaurantDraft.address.trim()) {
      this.message = 'Nom et adresse sont requis.';
      return;
    }

    if (!this.restaurantDraft.addressDetails) {
      this.message = 'Selectionne une adresse valide dans la liste proposee.';
      return;
    }

    if (this.restaurantFormMode === 'create') {
      this.restaurantOwnerDataService.createRestaurant(this.toRestaurantRequest()).subscribe({
        next: (restaurant) => {
          const createdRestaurant = this.cloneRestaurant(restaurant);

          this.restaurants = [createdRestaurant, ...this.restaurants];
          this.selectedRestaurant = createdRestaurant;
          this.restaurantFormMode = 'hidden';
          this.message = 'Restaurant ajoute.';
          void this.router.navigate(['/tabs/restaurant-owner', createdRestaurant.id]);
        },
        error: () => {
          this.message = "L'ajout du restaurant a echoue.";
        },
      });
      return;
    }

    if (!this.restaurantDraft.id) {
      return;
    }

    this.restaurantOwnerDataService.updateRestaurant(this.restaurantDraft.id, this.toRestaurantRequest()).subscribe({
      next: (restaurant) => {
        const updatedRestaurant = this.cloneRestaurant(restaurant);

        this.replaceRestaurant(updatedRestaurant);
        this.restaurantFormMode = 'hidden';
        this.message = 'Restaurant modifie.';
      },
      error: () => {
        this.message = 'La modification du restaurant a echoue.';
      },
    });
  }

  deleteRestaurant(restaurantId: string, event?: Event): void {
    event?.stopPropagation();

    this.restaurantOwnerDataService.deleteRestaurant(restaurantId).subscribe({
      next: () => {
        this.restaurants = this.restaurants.filter((restaurant) => restaurant.id !== restaurantId);

        if (this.selectedRestaurant?.id === restaurantId) {
          this.backToList();
        }
      },
      error: () => {
        this.message = 'La suppression du restaurant a echoue.';
      },
    });
  }

  startAddProduct(): void {
    this.productFormMode = 'create';
    this.productDraft = this.createProductDraft();
  }

  startEditProduct(product: RestaurantProduct): void {
    this.productFormMode = 'edit';
    this.productDraft = this.createProductDraft(product);
  }

  saveProduct(): void {
    if (!this.selectedRestaurant || !this.productDraft.name.trim() || this.productDraft.price <= 0) {
      this.message = 'Nom et prix du produit sont requis.';
      return;
    }

    const editMode = this.productFormMode === 'edit';
    const payload = this.toProductRequest();
    const request = editMode && this.productDraft.id
      ? this.restaurantOwnerDataService.updateProduct(this.selectedRestaurant.id, this.productDraft.id, payload)
      : this.restaurantOwnerDataService.createProduct(this.selectedRestaurant.id, payload);

    request.subscribe({
      next: (product) => {
        this.updateSelectedRestaurant((restaurant) => ({
          ...restaurant,
          products: editMode
            ? restaurant.products.map((item) => (item.id === product.id ? product : item))
            : [product, ...restaurant.products],
        }));
        this.productFormMode = 'hidden';
        this.message = editMode ? 'Produit modifie.' : 'Produit ajoute.';
      },
      error: () => {
        this.message = editMode ? 'La modification du produit a echoue.' : "L'ajout du produit a echoue.";
      },
    });
  }

  deleteProduct(productId: string): void {
    if (!this.selectedRestaurant) {
      return;
    }

    this.restaurantOwnerDataService.deleteProduct(this.selectedRestaurant.id, productId).subscribe({
      next: () => {
        this.updateSelectedRestaurant((restaurant) => ({
          ...restaurant,
          products: restaurant.products.filter((product) => product.id !== productId),
          menus: restaurant.menus.map((menu) => ({
            ...menu,
            productIds: menu.productIds.filter((id) => id !== productId),
          })),
        }));
      },
      error: () => {
        this.message = 'La suppression du produit a echoue.';
      },
    });
  }

  startAddMenu(): void {
    this.menuFormMode = 'create';
    this.menuDraft = this.createMenuDraft();
  }

  startEditMenu(menu: RestaurantMenu): void {
    this.menuFormMode = 'edit';
    this.menuDraft = this.createMenuDraft(menu);
  }

  saveMenu(): void {
    if (!this.selectedRestaurant || !this.menuDraft.name.trim() || this.menuDraft.price <= 0) {
      this.message = 'Nom et prix du menu sont requis.';
      return;
    }

    const editMode = this.menuFormMode === 'edit';
    const payload = this.toMenuRequest();
    const request = editMode && this.menuDraft.id
      ? this.restaurantOwnerDataService.updateMenu(this.selectedRestaurant.id, this.menuDraft.id, payload)
      : this.restaurantOwnerDataService.createMenu(this.selectedRestaurant.id, payload);

    request.subscribe({
      next: (menu) => {
        this.updateSelectedRestaurant((restaurant) => ({
          ...restaurant,
          menus: editMode
            ? restaurant.menus.map((item) => (item.id === menu.id ? menu : item))
            : [menu, ...restaurant.menus],
        }));
        this.menuFormMode = 'hidden';
        this.message = editMode ? 'Menu modifie.' : 'Menu ajoute.';
      },
      error: () => {
        this.message = editMode ? 'La modification du menu a echoue.' : "L'ajout du menu a echoue.";
      },
    });
  }

  deleteMenu(menuId: string): void {
    if (!this.selectedRestaurant) {
      return;
    }

    this.restaurantOwnerDataService.deleteMenu(this.selectedRestaurant.id, menuId).subscribe({
      next: () => {
        this.updateSelectedRestaurant((restaurant) => ({
          ...restaurant,
          menus: restaurant.menus.filter((menu) => menu.id !== menuId),
        }));
      },
      error: () => {
        this.message = 'La suppression du menu a echoue.';
      },
    });
  }

  toggleMenuProduct(productId: string, checked: boolean): void {
    this.menuDraft.productIds = checked
      ? [...this.menuDraft.productIds, productId]
      : this.menuDraft.productIds.filter((id) => id !== productId);
  }

  cancelForms(): void {
    this.restaurantFormMode = 'hidden';
    this.productFormMode = 'hidden';
    this.menuFormMode = 'hidden';
    this.addressSuggestions = [];

    if (this.route.snapshot.paramMap.get('restaurantId') === 'new') {
      this.backToList();
    }
  }

  isMenuProductSelected(productId: string): boolean {
    return this.menuDraft.productIds.includes(productId);
  }

  getMenuProductNames(menu: RestaurantMenu): string {
    const products = this.selectedRestaurant?.products ?? [];

    return products
      .filter((product) => menu.productIds.includes(product.id))
      .map((product) => product.name)
      .join(', ');
  }

  formatMoney(price: number, currency: CurrencyCode): string {
    return `${price.toFixed(2).replace('.', ',')} ${currency}`;
  }

  get visibleRestaurantOrders(): WorkflowOrder[] {
    if (!this.selectedRestaurant) {
      return this.restaurantOrders;
    }

    return this.restaurantOrders.filter((order) => order.restaurantId === this.selectedRestaurant?.id);
  }

  get pendingRestaurantOrders(): WorkflowOrder[] {
    return this.restaurantOrders.filter((order) => order.status === 'WAITING_RESTAURANT_VALIDATION');
  }

  get hasPendingRestaurantOrders(): boolean {
    return this.pendingRestaurantOrders.length > 0;
  }

  acceptOrder(order: WorkflowOrder): void {
    this.processingOrderIds.add(order.id);
    this.processingOrderIds = new Set(this.processingOrderIds);
    this.orderWorkflowService.acceptRestaurantOrder(order.id).subscribe({
      next: () => {
        this.message = 'Commande acceptee. Elle est maintenant disponible pour les riders.';
        this.loadRestaurantOrders();
        this.clearProcessingOrder(order.id);
      },
      error: () => {
        this.message = "L'acceptation de la commande a echoue.";
        this.clearProcessingOrder(order.id);
      },
    });
  }

  refuseOrder(order: WorkflowOrder): void {
    this.processingOrderIds.add(order.id);
    this.processingOrderIds = new Set(this.processingOrderIds);
    this.orderWorkflowService.refuseRestaurantOrder(order.id).subscribe({
      next: () => {
        this.message = 'Commande refusee.';
        this.loadRestaurantOrders();
        this.clearProcessingOrder(order.id);
      },
      error: () => {
        this.message = 'Le refus de la commande a echoue.';
        this.clearProcessingOrder(order.id);
      },
    });
  }

  markOrderReady(order: WorkflowOrder): void {
    this.processingOrderIds.add(order.id);
    this.processingOrderIds = new Set(this.processingOrderIds);
    this.orderWorkflowService.markRestaurantOrderReady(order.id).subscribe({
      next: () => {
        this.message = 'Commande marquee prete.';
        this.loadRestaurantOrders();
        this.clearProcessingOrder(order.id);
      },
      error: () => {
        this.message = 'La commande ne peut pas encore etre marquee prete.';
        this.clearProcessingOrder(order.id);
      },
    });
  }

  isProcessingOrder(order: WorkflowOrder): boolean {
    return this.processingOrderIds.has(order.id);
  }

  canAccept(order: WorkflowOrder): boolean {
    return order.status === 'WAITING_RESTAURANT_VALIDATION';
  }

  canMarkReady(order: WorkflowOrder): boolean {
    return order.status === 'RIDER_ASSIGNED';
  }

  orderStatusLabel(order: WorkflowOrder): string {
    return this.orderWorkflowService.statusLabel(order.status);
  }

  orderRestaurantName(order: WorkflowOrder): string {
    return this.restaurants.find((restaurant) => restaurant.id === order.restaurantId)?.name ?? 'Restaurant';
  }

  orderItemName(item: WorkflowOrder['items'][number]): string {
    return item.itemNameSnapshot || 'Article commande';
  }

  orderItemTotal(item: WorkflowOrder['items'][number]): number {
    return item.totalPrice ?? (item.unitPrice ?? 0) * item.quantity;
  }

  formatOrderDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  }

  selectProductType(type: ProductType): void {
    this.productDraft.type = type;
  }

  selectRestaurantCategory(category: string): void {
    this.restaurantDraft.category = category;
  }

  getRestaurantCategoryIcon(category: string): string {
    return this.findRestaurantCategory(category).icon;
  }

  getProductTypeLabel(type?: ProductType): string {
    return this.findProductType(type).label;
  }

  getProductTypeIcon(type?: ProductType): string {
    return this.findProductType(type).icon;
  }

  getMenuPrice(menu: RestaurantMenu): number {
    return menu.price ?? menu.totalPrice ?? 0;
  }

  searchRestaurantAddress(value: string): void {
    this.restaurantDraft.address = value;
    this.restaurantDraft.selectedAddress = null;
    this.restaurantDraft.addressDetails = null;
    this.addressSearch$.next(value);
  }

  selectRestaurantAddress(suggestion: AddressSuggestion): void {
    this.restaurantDraft.selectedAddress = suggestion;
    this.restaurantDraft.address = suggestion.label;
    this.restaurantDraft.addressDetails = this.toAddressPayload(suggestion);
    this.addressSuggestions = [];
    this.message = '';
  }

  private syncRoute(): void {
    const restaurantId = this.route.snapshot.paramMap.get('restaurantId');

    if (!restaurantId) {
      this.selectedRestaurant = null;
      this.restaurantFormMode = 'hidden';
      return;
    }

    if (restaurantId === 'new') {
      this.selectedRestaurant = null;
      this.restaurantFormMode = 'create';
      this.restaurantDraft = this.createRestaurantDraft();
      return;
    }

    this.selectedRestaurant = this.restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
  }

  private loadRestaurantOrders(): void {
    this.orderWorkflowService.getRestaurantOwnerOrders().subscribe({
      next: (orders) => (this.restaurantOrders = this.sortOrders(orders)),
      error: () => (this.restaurantOrders = []),
    });
  }

  private sortOrders(orders: WorkflowOrder[]): WorkflowOrder[] {
    const priority: Record<WorkflowOrder['status'], number> = {
      WAITING_RESTAURANT_VALIDATION: 0,
      ACCEPTED_BY_RESTAURANT: 1,
      AVAILABLE_FOR_RIDER: 2,
      RIDER_ASSIGNED: 3,
      READY_FOR_PICKUP: 4,
      PICKED_UP: 5,
      EN_ROUTE: 6,
      CREATED: 7,
      REJECTED_BY_RESTAURANT: 8,
      CANCELLED: 9,
      FAILED: 10,
      DELIVERED: 11,
    };

    return [...orders].sort((first, second) => {
      const priorityDelta = priority[first.status] - priority[second.status];

      return priorityDelta || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }

  private clearProcessingOrder(orderId: string): void {
    this.processingOrderIds.delete(orderId);
    this.processingOrderIds = new Set(this.processingOrderIds);
  }

  private updateRestaurant(restaurantId: string, updater: (restaurant: OwnerRestaurant) => OwnerRestaurant): void {
    this.restaurants = this.restaurants.map((restaurant) =>
      restaurant.id === restaurantId ? updater(restaurant) : restaurant,
    );
    this.selectedRestaurant = this.restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
  }

  private replaceRestaurant(updatedRestaurant: OwnerRestaurant): void {
    this.restaurants = this.restaurants.map((restaurant) =>
      restaurant.id === updatedRestaurant.id ? updatedRestaurant : restaurant,
    );
    this.selectedRestaurant = updatedRestaurant;
  }

  private updateSelectedRestaurant(updater: (restaurant: OwnerRestaurant) => OwnerRestaurant): void {
    if (!this.selectedRestaurant) {
      return;
    }

    this.updateRestaurant(this.selectedRestaurant.id, updater);
  }

  private createRestaurantDraft(restaurant?: OwnerRestaurant): RestaurantDraft {
    return {
      id: restaurant?.id ?? null,
      name: restaurant?.name ?? '',
      description: restaurant?.description ?? '',
      address: restaurant?.address ?? '',
      selectedAddress: null,
      addressDetails: restaurant?.addressDetails ? { ...restaurant.addressDetails } : null,
      openingHours: restaurant?.openingHours ?? '',
      category: restaurant?.category ?? 'Italien',
      image: restaurant?.image ?? 'assets/gravity/bella-pizza.png',
      status: restaurant?.status ?? 'OPEN',
    };
  }

  private createProductDraft(product?: RestaurantProduct): ProductDraft {
    return {
      id: product?.id ?? null,
      name: product?.name ?? '',
      type: product?.type ?? 'MAIN',
      price: product?.price ?? 0,
      currency: product?.currency ?? 'EUR',
      available: product?.available ?? true,
    };
  }

  private createMenuDraft(menu?: RestaurantMenu): MenuDraft {
    return {
      id: menu?.id ?? null,
      name: menu?.name ?? '',
      price: menu?.price ?? menu?.totalPrice ?? 0,
      currency: menu?.currency ?? 'EUR',
      productIds: menu ? [...menu.productIds] : [],
    };
  }

  private createAddressDetails(address: string): RegisterAddressPayload {
    return {
      label: 'Restaurant',
      line1: address.trim(),
      line2: null,
      city: '',
      postalCode: '',
      country: 'France',
      defaultAddress: true,
      latitude: null,
      longitude: null,
    };
  }

  private toRestaurantRequest(): RestaurantCreateRequest {
    return {
      name: this.restaurantDraft.name.trim(),
      description: this.restaurantDraft.description.trim(),
      address: this.restaurantDraft.address.trim(),
      addressDetails: this.restaurantDraft.addressDetails ?? this.createAddressDetails(this.restaurantDraft.address),
      openingHours: this.restaurantDraft.openingHours.trim(),
      category: this.restaurantDraft.category,
      image: this.restaurantDraft.image.trim() || 'assets/gravity/bella-pizza.png',
      status: this.restaurantDraft.status,
    };
  }

  private toAddressPayload(suggestion: AddressSuggestion): RegisterAddressPayload {
    return {
      label: 'Restaurant',
      line1: suggestion.line1,
      line2: null,
      city: suggestion.city,
      postalCode: suggestion.postalCode,
      country: suggestion.country,
      defaultAddress: true,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    };
  }

  private toProductRequest(): ProductCreateRequest {
    return {
      name: this.productDraft.name.trim(),
      type: this.productDraft.type,
      price: Number(this.productDraft.price),
      currency: this.productDraft.currency,
      available: this.productDraft.available,
    };
  }

  private toMenuRequest(): MenuCreateRequest {
    return {
      name: this.menuDraft.name.trim(),
      price: Number(this.menuDraft.price),
      currency: this.menuDraft.currency,
      productIds: [...this.menuDraft.productIds],
    };
  }

  private cloneRestaurant(restaurant: OwnerRestaurant): OwnerRestaurant {
    return {
      ...restaurant,
      addressDetails: restaurant.addressDetails ? { ...restaurant.addressDetails } : this.createAddressDetails(restaurant.address),
      products: (restaurant.products ?? []).map((product) => ({ ...product })),
      menus: (restaurant.menus ?? []).map((menu) => ({ ...menu, productIds: [...menu.productIds] })),
    };
  }

  private findProductType(type?: ProductType): ProductTypeOption {
    return this.productTypes.find((productType) => productType.value === type) ?? this.productTypes[1];
  }

  private findRestaurantCategory(category: string): RestaurantCategoryOption {
    return (
      this.restaurantCategories.find((restaurantCategory) => restaurantCategory.value === category) ??
      this.restaurantCategories[0]
    );
  }
}

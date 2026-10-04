import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  arrowBackOutline,
  bagCheckOutline,
  cartOutline,
  checkmarkCircle,
  locationOutline,
  receiptOutline,
  removeCircleOutline,
  restaurantOutline,
  star,
} from 'ionicons/icons';
import {
  CustomerOrderService,
  OrderCartItem,
  OrderMenu,
  OrderProduct,
} from '../services/customer-order.service';
import { ProductType } from '../services/restaurant-owner-data.service';
import { TranslationService } from '../core/i18n/translation.service';
import { AddressLookupService } from '../core/services/address-lookup.service';
import { AuthService, AuthUser } from '../core/services/auth.service';
import {
  CreateWorkflowOrderRequest,
  OrderWorkflowService,
  PublicMenuPackage,
  PublicMenuProduct,
} from '../services/order-workflow.service';
import { map, of } from 'rxjs';

type ProductSection = {
  type: ProductType;
  label: string;
  products: OrderProduct[];
};

type DeliveryCoordinates = {
  latitude: number;
  longitude: number;
};

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonContent, IonIcon],
})
export class Tab3Page implements OnInit {
  private readonly customerOrderService = inject(CustomerOrderService);
  private readonly orderWorkflowService = inject(OrderWorkflowService);
  private readonly addressLookupService = inject(AddressLookupService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);

  readonly selectedRestaurant = this.customerOrderService.selectedRestaurant;
  readonly cartItems = this.customerOrderService.cartItems;
  readonly cartTotal = this.customerOrderService.cartTotal;
  readonly cartQuantity = this.customerOrderService.cartQuantity;
  readonly menus = computed(() => {
    return this.backendMenus();
  });
  readonly productSections = computed<ProductSection[]>(() => {
    const restaurant = this.selectedRestaurant();

    if (!restaurant) {
      return [];
    }

    const products = this.backendProducts();

    return (['STARTER', 'MAIN', 'DESSERT', 'DRINK'] as ProductType[])
      .map((type) => ({
        type,
        label: this.productTypeLabels[type],
        products: products.filter((product) => product.type === type),
      }))
      .filter((section) => section.products.length);
  });

  orderMessage = '';
  isSubmittingOrder = false;
  isLoadingMenu = false;
  backendProducts = signal<PublicMenuProduct[]>([]);
  backendMenus = signal<PublicMenuPackage[]>([]);

  private readonly productTypeLabels: Record<ProductType, string> = {
    STARTER: 'Entrees',
    MAIN: 'Plats',
    DESSERT: 'Desserts',
    DRINK: 'Boissons',
  };

  constructor() {
    addIcons({
      addCircleOutline,
      arrowBackOutline,
      bagCheckOutline,
      cartOutline,
      checkmarkCircle,
      locationOutline,
      receiptOutline,
      removeCircleOutline,
      restaurantOutline,
      star,
    });
  }

  ngOnInit(): void {
    this.loadSelectedRestaurantMenu();
  }

  ionViewWillEnter(): void {
    this.loadSelectedRestaurantMenu();
  }

  chooseAnotherRestaurant(): void {
    void this.router.navigate(['/tabs/home']);
  }

  addMenu(menu: OrderMenu): void {
    this.orderMessage = '';
    this.customerOrderService.addMenu(menu);
  }

  addProduct(product: OrderProduct): void {
    this.orderMessage = '';
    this.customerOrderService.addProduct(product);
  }

  incrementItem(item: OrderCartItem): void {
    this.customerOrderService.incrementItem(item.id, item.kind);
  }

  decrementItem(item: OrderCartItem): void {
    this.customerOrderService.decrementItem(item.id, item.kind);
  }

  getMenuQuantity(menu: OrderMenu): number {
    return this.customerOrderService.getItemQuantity(menu.id, 'menu');
  }

  getProductQuantity(product: OrderProduct): number {
    return this.customerOrderService.getItemQuantity(product.id, 'product');
  }

  placeOrder(): void {
    if (!this.cartQuantity()) {
      this.orderMessage = 'Ajoute au moins un menu ou un produit.';
      return;
    }

    const restaurant = this.selectedRestaurant();
    const user = this.authService.getCachedUser();
    const deliveryAddress = user?.address?.trim();

    if (!restaurant) {
      this.orderMessage = 'Choisis un restaurant avant de commander.';
      return;
    }

    if (!deliveryAddress) {
      this.orderMessage = 'Adresse client manquante. Mets a jour ton adresse.';
      return;
    }

    const invalidCartItem = this.cartItems().find((item) => !this.isUuid(item.id));
    if (invalidCartItem) {
      this.orderMessage = `Le produit "${invalidCartItem.name}" ne vient pas du backend. Vide le panier et recharge le restaurant.`;
      return;
    }

    const items = this.cartItems().map((item) => ({
      dishId: item.kind === 'product' ? item.id : null,
      menuPackageId: item.kind === 'menu' ? item.id : null,
      quantity: item.quantity,
    }));

    this.isSubmittingOrder = true;
    this.orderMessage = 'Verification de ton adresse...';

    this.resolveDeliveryCoordinates(user, deliveryAddress).subscribe({
      next: (coordinates) => this.submitOrder({
        restaurantId: String(restaurant.id),
        deliveryAddress,
        clientLatitude: coordinates.latitude,
        clientLongitude: coordinates.longitude,
        items,
      }),
      error: () => {
        this.orderMessage = 'Impossible de trouver les coordonnees de ton adresse. Verifie ton adresse de profil.';
        this.isSubmittingOrder = false;
      },
    });
  }

  formatPrice(price: number, currency = 'EUR'): string {
    return `${price.toFixed(2).replace('.', ',')} ${currency}`;
  }

  private loadSelectedRestaurantMenu(): void {
    const restaurant = this.selectedRestaurant();
    if (!restaurant) {
      this.backendProducts.set([]);
      this.backendMenus.set([]);
      return;
    }

    this.isLoadingMenu = true;
    this.orderWorkflowService.getRestaurantMenu(restaurant.id).subscribe({
      next: (menu) => {
        this.backendProducts.set(menu.products);
        this.backendMenus.set(menu.menus);
        this.isLoadingMenu = false;
      },
      error: () => {
        this.backendProducts.set([]);
        this.backendMenus.set([]);
        this.isLoadingMenu = false;
      },
    });
  }

  private submitOrder(payload: CreateWorkflowOrderRequest): void {
    this.orderMessage = 'Creation de la commande...';

    this.orderWorkflowService.createOrder(payload).subscribe({
      next: (order) => {
        this.customerOrderService.clearCart();
        this.orderMessage = 'Commande creee. Redirection vers le suivi.';
        this.isSubmittingOrder = false;
        void this.router.navigate(['/tabs/orders'], {
          queryParams: {
            orderId: order.id,
          },
        });
      },
      error: () => {
        this.orderMessage = 'La commande a echoue. Verifie que le restaurant a des produits backend.';
        this.isSubmittingOrder = false;
      },
    });
  }

  private resolveDeliveryCoordinates(user: AuthUser | null, deliveryAddress: string) {
    const coordinates = this.readUserCoordinates(user);

    if (coordinates) {
      return of(coordinates);
    }

    return this.addressLookupService.searchFrenchAddresses(deliveryAddress).pipe(
      map((suggestions) => {
        const suggestion = suggestions.find((entry) => entry.latitude !== null && entry.longitude !== null);

        if (suggestion?.latitude === null || suggestion?.longitude === null || !suggestion) {
          throw new Error('Missing address coordinates');
        }

        return {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        };
      }),
    );
  }

  private readUserCoordinates(user: AuthUser | null): DeliveryCoordinates | null {
    const latitude = user?.addressDetails?.latitude;
    const longitude = user?.addressDetails?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return null;
    }

    return { latitude, longitude };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}

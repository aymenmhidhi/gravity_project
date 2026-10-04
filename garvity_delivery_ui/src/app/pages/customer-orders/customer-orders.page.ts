import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bagCheckOutline,
  bicycleOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  closeCircleOutline,
  receiptOutline,
  restaurantOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  OrderStatus,
  OrderWorkflowService,
  WorkflowHistoryEntry,
  WorkflowOrder,
  WorkflowTracking,
} from '../../services/order-workflow.service';
import { OwnerRestaurant, RestaurantOwnerDataService } from '../../services/restaurant-owner-data.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeNotificationService } from '../../services/realtime-notification.service';

type TimelineState = 'done' | 'active' | 'pending' | 'blocked';

type TimelineStep = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  statuses: OrderStatus[];
};

type TimelineStepView = TimelineStep & {
  state: TimelineState;
  dateLabel: string | null;
};

@Component({
  selector: 'app-customer-orders',
  templateUrl: './customer-orders.page.html',
  styleUrls: ['./customer-orders.page.scss'],
  imports: [IonContent, IonIcon],
})
export class CustomerOrdersPage implements OnInit {
  private readonly orderWorkflowService = inject(OrderWorkflowService);
  private readonly restaurantOwnerDataService = inject(RestaurantOwnerDataService);
  private readonly authService = inject(AuthService);
  private readonly realtimeNotificationService = inject(RealtimeNotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  myOrders: WorkflowOrder[] = [];
  ownerOrders: WorkflowOrder[] = [];
  ownerRestaurants: OwnerRestaurant[] = [];
  selectedOrder: WorkflowOrder | null = null;
  selectedTracking: WorkflowTracking | null = null;
  selectedHistory: WorkflowHistoryEntry[] = [];
  processingOrderIds = new Set<string>();
  isLoading = false;
  actionMessage = '';
  loadError = '';

  private readonly timelineSteps: TimelineStep[] = [
    {
      id: 'validation',
      label: 'Validation restaurant',
      detail: 'La commande est envoyee au restaurant.',
      icon: 'time-outline',
      statuses: ['CREATED', 'WAITING_RESTAURANT_VALIDATION'],
    },
    {
      id: 'preparation',
      label: 'En cours de preparation',
      detail: 'Le restaurant prepare la commande.',
      icon: 'restaurant-outline',
      statuses: ['ACCEPTED_BY_RESTAURANT', 'AVAILABLE_FOR_RIDER', 'READY_FOR_PICKUP'],
    },
    {
      id: 'rider',
      label: 'Rider assigne',
      detail: 'Un rider a pris la commande.',
      icon: 'bicycle-outline',
      statuses: ['RIDER_ASSIGNED'],
    },
    {
      id: 'pickup',
      label: 'Recuperee',
      detail: 'Le rider a recupere la commande au restaurant.',
      icon: 'bag-check-outline',
      statuses: ['PICKED_UP'],
    },
    {
      id: 'delivery',
      label: 'En cours de livraison',
      detail: 'Le rider est en route vers le client.',
      icon: 'bicycle-outline',
      statuses: ['EN_ROUTE'],
    },
    {
      id: 'delivered',
      label: 'Livree',
      detail: 'La commande est livree au client.',
      icon: 'checkmark-circle-outline',
      statuses: ['DELIVERED'],
    },
  ];

  constructor() {
    addIcons({
      alertCircleOutline,
      bagCheckOutline,
      bicycleOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      closeCircleOutline,
      receiptOutline,
      restaurantOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    if (this.isRestaurantOwner) {
      this.loadOwnerRestaurants();
    }

    this.refreshOrders();

    this.realtimeNotificationService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if (!notification.orderId) {
          return;
        }

        this.refreshOrders(notification.orderId);
      });
  }

  ionViewWillEnter(): void {
    this.refreshOrders();
  }

  get isRestaurantOwner(): boolean {
    return this.authService.getCachedUser()?.role === 'RESTAURANT_OWNER';
  }

  refreshOrders(preferredOrderId?: string): void {
    if (this.isRestaurantOwner) {
      this.refreshOwnerOrders();
      return;
    }

    this.refreshCustomerOrders(preferredOrderId);
  }

  refreshCustomerOrders(preferredOrderId?: string): void {
    this.isLoading = true;
    this.loadError = '';
    this.orderWorkflowService.getMyOrders().subscribe({
      next: (orders) => {
        this.myOrders = [...orders].sort((first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        );

        const queryOrderId = this.route.snapshot.queryParamMap.get('orderId');
        const selectedId = preferredOrderId ?? queryOrderId ?? this.selectedOrder?.id ?? this.myOrders[0]?.id;

        if (selectedId) {
          this.openOrder(selectedId);
        } else {
          this.selectedOrder = null;
          this.selectedTracking = null;
          this.selectedHistory = [];
        }

        this.isLoading = false;
      },
      error: () => {
        this.myOrders = [];
        this.selectedOrder = null;
        this.selectedTracking = null;
        this.selectedHistory = [];
        this.loadError = 'Impossible de charger les commandes. Verifie que le backend est demarre sur localhost:8080.';
        this.isLoading = false;
      },
    });
  }

  refreshOwnerOrders(): void {
    this.isLoading = true;
    this.loadError = '';
    this.orderWorkflowService.getRestaurantOwnerOrders().subscribe({
      next: (orders) => {
        this.ownerOrders = this.sortOwnerOrders(orders);
        this.isLoading = false;
      },
      error: () => {
        this.ownerOrders = [];
        this.loadError = 'Impossible de charger les commandes restaurant. Verifie que le backend est demarre sur localhost:8080.';
        this.isLoading = false;
      },
    });
  }

  openOrder(orderId: string): void {
    const order = this.myOrders.find((item) => item.id === orderId) ?? null;
    this.selectedOrder = order;
    this.actionMessage = '';

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.orderWorkflowService.getTracking(orderId).subscribe({
      next: (tracking) => (this.selectedTracking = tracking),
      error: () => (this.selectedTracking = null),
    });

    this.orderWorkflowService.getHistory(orderId).subscribe({
      next: (history) => (this.selectedHistory = history),
      error: () => (this.selectedHistory = []),
    });
  }

  cancelOrder(order: WorkflowOrder): void {
    this.orderWorkflowService.cancelCustomerOrder(order.id).subscribe({
      next: (updatedOrder) => {
        this.selectedOrder = updatedOrder;
        this.actionMessage = 'Commande annulee.';
        this.refreshOrders(updatedOrder.id);
      },
      error: () => {
        this.actionMessage = 'Cette commande ne peut plus etre annulee.';
      },
    });
  }

  goToCart(): void {
    void this.router.navigate(['/tabs/cart']);
  }

  canCancel(order: WorkflowOrder): boolean {
    return ['WAITING_RESTAURANT_VALIDATION', 'ACCEPTED_BY_RESTAURANT', 'AVAILABLE_FOR_RIDER'].includes(order.status);
  }

  get ownerPendingCount(): number {
    return this.ownerOrders.filter((order) => order.status === 'WAITING_RESTAURANT_VALIDATION').length;
  }

  get ownerPreparationCount(): number {
    return this.ownerOrders.filter((order) =>
      ['ACCEPTED_BY_RESTAURANT', 'AVAILABLE_FOR_RIDER', 'RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(order.status),
    ).length;
  }

  get ownerDeliveryCount(): number {
    return this.ownerOrders.filter((order) => ['PICKED_UP', 'EN_ROUTE'].includes(order.status)).length;
  }

  get ownerActiveCount(): number {
    return this.ownerOrders.filter((order) =>
      !['DELIVERED', 'REJECTED_BY_RESTAURANT', 'CANCELLED', 'FAILED'].includes(order.status),
    ).length;
  }

  acceptOwnerOrder(order: WorkflowOrder): void {
    this.setOrderProcessing(order.id, true);
    this.orderWorkflowService.acceptRestaurantOrder(order.id).subscribe({
      next: () => {
        this.actionMessage = 'Commande prise. Elle est maintenant disponible pour les riders.';
        this.refreshOwnerOrders();
        this.setOrderProcessing(order.id, false);
      },
      error: () => {
        this.actionMessage = "L'acceptation de la commande a echoue.";
        this.setOrderProcessing(order.id, false);
      },
    });
  }

  refuseOwnerOrder(order: WorkflowOrder): void {
    this.setOrderProcessing(order.id, true);
    this.orderWorkflowService.refuseRestaurantOrder(order.id).subscribe({
      next: () => {
        this.actionMessage = 'Commande refusee.';
        this.refreshOwnerOrders();
        this.setOrderProcessing(order.id, false);
      },
      error: () => {
        this.actionMessage = 'Le refus de la commande a echoue.';
        this.setOrderProcessing(order.id, false);
      },
    });
  }

  markOwnerOrderReady(order: WorkflowOrder): void {
    this.setOrderProcessing(order.id, true);
    this.orderWorkflowService.markRestaurantOrderReady(order.id).subscribe({
      next: () => {
        this.actionMessage = 'Commande marquee prete.';
        this.refreshOwnerOrders();
        this.setOrderProcessing(order.id, false);
      },
      error: () => {
        this.actionMessage = 'La commande ne peut pas encore etre marquee prete.';
        this.setOrderProcessing(order.id, false);
      },
    });
  }

  canAcceptOwnerOrder(order: WorkflowOrder): boolean {
    return order.status === 'WAITING_RESTAURANT_VALIDATION';
  }

  canMarkOwnerOrderReady(order: WorkflowOrder): boolean {
    return order.status === 'RIDER_ASSIGNED';
  }

  isOwnerOrderProcessing(order: WorkflowOrder): boolean {
    return this.processingOrderIds.has(order.id);
  }

  ownerRestaurantName(order: WorkflowOrder): string {
    return this.ownerRestaurants.find((restaurant) => restaurant.id === order.restaurantId)?.name ?? 'Restaurant';
  }

  orderItemName(item: WorkflowOrder['items'][number]): string {
    return item.itemNameSnapshot || 'Article commande';
  }

  orderItemTotal(item: WorkflowOrder['items'][number]): number {
    return item.totalPrice ?? (item.unitPrice ?? 0) * item.quantity;
  }

  statusLabel(status: OrderStatus): string {
    return this.orderWorkflowService.statusLabel(status);
  }

  timeline(): TimelineStepView[] {
    const order = this.selectedOrder;

    if (!order) {
      return this.timelineSteps.map((step, index) => ({
        ...step,
        state: index === 0 ? 'active' : 'pending',
        dateLabel: null,
      }));
    }

    const terminalStep = this.getTerminalStep(order.status);
    const steps = terminalStep ? [...this.timelineSteps, terminalStep] : this.timelineSteps;
    const currentIndex = terminalStep ? steps.length - 1 : this.getCurrentStepIndex(order.status);

    return steps.map((step, index) => ({
      ...step,
      state: this.getStepState(index, currentIndex, Boolean(terminalStep)),
      dateLabel: this.findStepDateLabel(step, order),
    }));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  }

  formatPrice(price: number, currency = 'EUR'): string {
    return `${price.toFixed(2).replace('.', ',')} ${currency}`;
  }

  orderReference(order: WorkflowOrder): string {
    return `#${order.id.slice(0, 8).toUpperCase()}`;
  }

  private getCurrentStepIndex(status: OrderStatus): number {
    const index = this.timelineSteps.findIndex((step) => step.statuses.includes(status));

    return Math.max(index, 0);
  }

  private loadOwnerRestaurants(): void {
    this.restaurantOwnerDataService.getDashboard().subscribe({
      next: (data) => (this.ownerRestaurants = data.restaurants ?? []),
      error: () => (this.ownerRestaurants = []),
    });
  }

  private sortOwnerOrders(orders: WorkflowOrder[]): WorkflowOrder[] {
    const priority: Record<OrderStatus, number> = {
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

  private setOrderProcessing(orderId: string, isProcessing: boolean): void {
    if (isProcessing) {
      this.processingOrderIds.add(orderId);
    } else {
      this.processingOrderIds.delete(orderId);
    }

    this.processingOrderIds = new Set(this.processingOrderIds);
  }

  private getStepState(index: number, currentIndex: number, hasTerminalStep: boolean): TimelineState {
    if (hasTerminalStep && index === currentIndex) {
      return 'blocked';
    }

    if (index < currentIndex) {
      return 'done';
    }

    if (index === currentIndex) {
      return 'active';
    }

    return 'pending';
  }

  private getTerminalStep(status: OrderStatus): TimelineStep | null {
    if (status === 'REJECTED_BY_RESTAURANT') {
      return {
        id: 'rejected',
        label: 'Refusee par le restaurant',
        detail: 'Le restaurant a refuse la commande.',
        icon: 'close-circle-outline',
        statuses: ['REJECTED_BY_RESTAURANT'],
      };
    }

    if (status === 'CANCELLED') {
      return {
        id: 'cancelled',
        label: 'Annulee',
        detail: 'La commande a ete annulee.',
        icon: 'close-circle-outline',
        statuses: ['CANCELLED'],
      };
    }

    if (status === 'FAILED') {
      return {
        id: 'failed',
        label: 'Probleme de livraison',
        detail: 'La commande est marquee en echec.',
        icon: 'alert-circle-outline',
        statuses: ['FAILED'],
      };
    }

    return null;
  }

  private findStepDateLabel(step: TimelineStep, order: WorkflowOrder): string | null {
    const historyEntry = [...this.selectedHistory]
      .reverse()
      .find((entry) => step.statuses.includes(entry.toStatus));

    if (historyEntry) {
      return this.formatDate(historyEntry.changedAt);
    }

    if (step.statuses.includes(order.status)) {
      return this.formatDate(order.updatedAt);
    }

    if (step.statuses.includes('DELIVERED') && order.deliveredAt) {
      return this.formatDate(order.deliveredAt);
    }

    if (step.statuses.includes('CREATED')) {
      return this.formatDate(order.createdAt);
    }

    return null;
  }
}

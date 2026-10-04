import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bicycleOutline, checkmarkCircleOutline, locationOutline, navigateOutline, refreshOutline } from 'ionicons/icons';
import { OrderWorkflowService, WorkflowOrder } from '../../services/order-workflow.service';
import { RealtimeNotificationService } from '../../services/realtime-notification.service';

@Component({
  selector: 'app-rider-workflow',
  templateUrl: './rider-workflow.page.html',
  styleUrls: ['./rider-workflow.page.scss'],
  imports: [FormsModule, IonContent, IonIcon],
})
export class RiderWorkflowPage implements OnInit {
  private readonly orderWorkflowService = inject(OrderWorkflowService);
  private readonly realtimeNotificationService = inject(RealtimeNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  latitude = 36.8012;
  longitude = 10.1831;
  radiusKm = 20;
  availableOrders: WorkflowOrder[] = [];
  activeOrders: WorkflowOrder[] = [];
  message = '';
  isLoading = false;

  constructor() {
    addIcons({ bicycleOutline, checkmarkCircleOutline, locationOutline, navigateOutline, refreshOutline });
  }

  ngOnInit(): void {
    this.refresh();
    this.realtimeNotificationService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  ionViewWillEnter(): void {
    this.refresh();
  }

  refresh(): void {
    this.isLoading = true;
    this.message = '';

    this.orderWorkflowService.updateRiderLocation(this.latitude, this.longitude).subscribe({
      next: () => this.loadAvailableOrders(),
      error: () => this.loadAvailableOrders(),
    });
  }

  accept(order: WorkflowOrder): void {
    this.orderWorkflowService.acceptRiderOrder(order.id).subscribe({
      next: (updatedOrder) => {
        this.activeOrders = [updatedOrder, ...this.activeOrders.filter((item) => item.id !== updatedOrder.id)];
        this.refresh();
      },
      error: () => (this.message = 'Cette commande a deja ete prise ou nest plus disponible.'),
    });
  }

  markPickedUp(order: WorkflowOrder): void {
    this.orderWorkflowService.markPickedUp(order.id).subscribe({
      next: (updatedOrder) => this.replaceActiveOrder(updatedOrder),
      error: () => (this.message = 'Impossible de marquer la commande recuperee.'),
    });
  }

  markEnRoute(order: WorkflowOrder): void {
    this.orderWorkflowService.markEnRoute(order.id).subscribe({
      next: (updatedOrder) => this.replaceActiveOrder(updatedOrder),
      error: () => (this.message = 'Impossible de demarrer la livraison.'),
    });
  }

  markDelivered(order: WorkflowOrder): void {
    this.orderWorkflowService.markDelivered(order.id).subscribe({
      next: (updatedOrder) => {
        this.replaceActiveOrder(updatedOrder);
        this.refresh();
      },
      error: () => (this.message = 'Impossible de livrer la commande.'),
    });
  }

  statusLabel(order: WorkflowOrder): string {
    return this.orderWorkflowService.statusLabel(order.status);
  }

  formatPrice(price: number): string {
    return `${price.toFixed(2).replace('.', ',')} EUR`;
  }

  canPickUp(order: WorkflowOrder): boolean {
    return order.status === 'RIDER_ASSIGNED' || order.status === 'READY_FOR_PICKUP';
  }

  canStartDelivery(order: WorkflowOrder): boolean {
    return order.status === 'PICKED_UP';
  }

  canDeliver(order: WorkflowOrder): boolean {
    return order.status === 'EN_ROUTE';
  }

  private loadAvailableOrders(): void {
    this.orderWorkflowService.getAvailableRiderOrders(this.latitude, this.longitude, this.radiusKm).subscribe({
      next: (orders) => {
        this.availableOrders = orders;
        this.loadMyOrders();
      },
      error: () => {
        this.availableOrders = [];
        this.loadMyOrders();
      },
    });
  }

  private loadMyOrders(): void {
    this.orderWorkflowService.getMyRiderOrders().subscribe({
      next: (orders) => {
        this.activeOrders = orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
        this.isLoading = false;
      },
      error: () => {
        this.activeOrders = [];
        this.isLoading = false;
      },
    });
  }

  private replaceActiveOrder(updatedOrder: WorkflowOrder): void {
    this.activeOrders = [updatedOrder, ...this.activeOrders.filter((order) => order.id !== updatedOrder.id)];
  }
}

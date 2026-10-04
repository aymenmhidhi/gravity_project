import { Component, DestroyRef, EnvironmentInjector, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bicycleOutline, businessOutline, cartOutline, homeOutline, personOutline, receiptOutline, searchOutline } from 'ionicons/icons';
import { TranslationService } from '../core/i18n/translation.service';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../services/notification.service';
import { OrderStatus, OrderWorkflowService } from '../services/order-workflow.service';
import { RealtimeNotificationService } from '../services/realtime-notification.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly orderWorkflowService = inject(OrderWorkflowService);
  private readonly realtimeNotificationService = inject(RealtimeNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(TranslationService);
  readonly unreadCount = this.notificationService.unreadCount;
  ownerOrderBadgeCount = 0;

  get canManageRestaurants(): boolean {
    return this.authService.getCachedUser()?.role === 'RESTAURANT_OWNER';
  }

  get canDeliverOrders(): boolean {
    return this.authService.getCachedUser()?.role === 'COURIER';
  }

  constructor() {
    addIcons({ bicycleOutline, businessOutline, cartOutline, homeOutline, personOutline, receiptOutline, searchOutline });
    this.notificationService.loadMine().subscribe({ error: () => undefined });
    this.realtimeNotificationService.connect();
    this.loadOwnerOrderBadge();
    this.realtimeNotificationService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if (notification.orderId) {
          this.loadOwnerOrderBadge();
        }
      });
  }

  private loadOwnerOrderBadge(): void {
    if (!this.canManageRestaurants) {
      this.ownerOrderBadgeCount = 0;
      return;
    }

    this.orderWorkflowService.getRestaurantOwnerOrders().subscribe({
      next: (orders) => {
        this.ownerOrderBadgeCount = orders.filter((order) => this.isActiveOwnerOrderStatus(order.status)).length;
      },
      error: () => (this.ownerOrderBadgeCount = 0),
    });
  }

  private isActiveOwnerOrderStatus(status: OrderStatus): boolean {
    return !['DELIVERED', 'REJECTED_BY_RESTAURANT', 'CANCELLED', 'FAILED'].includes(status);
  }
}

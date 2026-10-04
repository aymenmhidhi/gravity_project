import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type AppNotification = {
  id: string;
  recipientUserId: string;
  orderId?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((notification) => !notification.read).length);

  loadMine(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.apiBaseUrl}/api/notifications/my`).pipe(
      tap((notifications) => this.notifications.set(notifications)),
    );
  }

  pushRealtime(notification: AppNotification): void {
    this.notifications.update((notifications) => [
      notification,
      ...notifications.filter((item) => item.id !== notification.id),
    ]);
  }

  markRead(notificationId: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.apiBaseUrl}/api/notifications/${notificationId}/read`, {}).pipe(
      tap((updatedNotification) => {
        this.notifications.update((notifications) =>
          notifications.map((notification) =>
            notification.id === updatedNotification.id ? updatedNotification : notification,
          ),
        );
      }),
    );
  }

  markAllRead(): Observable<AppNotification[]> {
    return this.http.patch<AppNotification[]>(`${this.apiBaseUrl}/api/notifications/read-all`, {}).pipe(
      tap((notifications) => this.notifications.set(notifications)),
    );
  }
}

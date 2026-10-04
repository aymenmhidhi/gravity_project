import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { AppNotification, NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class RealtimeNotificationService {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly eventsSubject = new Subject<AppNotification>();
  private socket?: WebSocket;
  private reconnectTimer?: number;
  private reconnectDelayMs = 5000;

  readonly events$ = this.eventsSubject.asObservable();

  connect(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsBaseUrl = environment.apiBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    this.socket = new WebSocket(`${wsBaseUrl}/ws/notifications?token=${encodeURIComponent(token)}`);

    this.socket.onmessage = (event) => {
      this.reconnectDelayMs = 5000;
      this.ngZone.run(() => {
        const notification = this.parseNotification(event.data);
        if (!notification) {
          return;
        }

        this.notificationService.pushRealtime(notification);
        this.eventsSubject.next(notification);
      });
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };

    this.socket.onclose = () => {
      this.socket = undefined;
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.socket?.close();
    this.socket = undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.authService.isAuthenticated()) {
      return;
    }

    const delayMs = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 60000);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private parseNotification(value: string): AppNotification | null {
    try {
      return JSON.parse(value) as AppNotification;
    } catch {
      return null;
    }
  }
}

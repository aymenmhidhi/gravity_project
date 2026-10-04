import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, logOutOutline, notificationsOutline, personCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { TranslationService } from '../core/i18n/translation.service';
import { AuthService } from '../core/services/auth.service';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher.component';
import { AppNotification, NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  imports: [IonContent, IonIcon, LanguageSwitcherComponent],
})
export class Tab5Page {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;

  constructor() {
    addIcons({ checkmarkDoneOutline, logOutOutline, notificationsOutline, personCircleOutline, shieldCheckmarkOutline });
    this.notificationService.loadMine().subscribe();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  markRead(notification: AppNotification): void {
    if (notification.read) {
      return;
    }

    this.notificationService.markRead(notification.id).subscribe();
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe();
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  }
}

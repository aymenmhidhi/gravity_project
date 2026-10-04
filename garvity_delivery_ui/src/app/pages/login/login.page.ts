import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, mailOutline, rocketOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { TranslationService } from '../../core/i18n/translation.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonIcon, LanguageSwitcherComponent],
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);

  email = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  constructor() {
    addIcons({ lockClosedOutline, mailOutline, rocketOutline });
  }

  login(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService
      .login(this.email, this.password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.getLoginTargetUrl());
        },
        error: (error: Error) => {
          this.errorMessage = error.message;
        },
      });
  }

  private getLoginTargetUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const defaultUrl = this.getDefaultUrlForCurrentRole();

    if (!returnUrl || returnUrl === '/' || returnUrl === '/tabs/home') {
      return defaultUrl;
    }

    const role = this.authService.getCachedUser()?.role;

    if (returnUrl.startsWith('/tabs/restaurant-owner') && role !== 'RESTAURANT_OWNER') {
      return defaultUrl;
    }

    if (returnUrl.startsWith('/tabs/rider') && role !== 'COURIER') {
      return defaultUrl;
    }

    return returnUrl;
  }

  private getDefaultUrlForCurrentRole(): string {
    const role = this.authService.getCachedUser()?.role;

    if (role === 'RESTAURANT_OWNER') {
      return '/tabs/restaurant-owner';
    }

    if (role === 'COURIER') {
      return '/tabs/rider';
    }

    return '/tabs/home';
  }
}

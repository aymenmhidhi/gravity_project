import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locationOutline, lockClosedOutline, mailOutline, personOutline, rocketOutline } from 'ionicons/icons';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap } from 'rxjs';
import { TranslationService } from '../../core/i18n/translation.service';
import { AddressLookupService, AddressSuggestion } from '../../core/services/address-lookup.service';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonIcon, LanguageSwitcherComponent],
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly addressLookupService = inject(AddressLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);
  private readonly addressSearch$ = new Subject<string>();

  email = '';
  password = '';
  firstName = 'Client';
  lastName = 'Demo';
  addressQuery = '';
  selectedAddress: AddressSuggestion | null = null;
  addressSuggestions: AddressSuggestion[] = [];
  isSearchingAddress = false;
  role: UserRole = 'CUSTOMER';
  readonly roles: Array<{ value: UserRole; labelKey: `role.${UserRole}` }> = [
    { value: 'CUSTOMER', labelKey: 'role.CUSTOMER' },
    { value: 'PARTNER', labelKey: 'role.PARTNER' },
    { value: 'RESTAURANT_OWNER', labelKey: 'role.RESTAURANT_OWNER' },
    { value: 'COURIER', labelKey: 'role.COURIER' },
    { value: 'ADMIN', labelKey: 'role.ADMIN' },
  ];
  errorMessage = '';
  isSubmitting = false;

  constructor() {
    addIcons({ locationOutline, lockClosedOutline, mailOutline, personOutline, rocketOutline });

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

  searchAddress(value: string): void {
    this.addressQuery = value;
    this.selectedAddress = null;
    this.addressSearch$.next(value);
  }

  selectAddress(suggestion: AddressSuggestion): void {
    this.selectedAddress = suggestion;
    this.addressQuery = suggestion.label;
    this.addressSuggestions = [];
    this.errorMessage = '';
  }

  register(): void {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';

    if (!this.selectedAddress || this.selectedAddress.label !== this.addressQuery.trim()) {
      this.errorMessage = 'Selectionne une adresse valide dans la liste proposee.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .register({
        email: this.email,
        password: this.password,
        firstName: this.firstName,
        lastName: this.lastName,
        address: this.selectedAddress.label,
        addressDetails: {
          label: 'Domicile',
          line1: this.selectedAddress.line1,
          line2: null,
          city: this.selectedAddress.city,
          postalCode: this.selectedAddress.postalCode,
          country: this.selectedAddress.country,
          defaultAddress: true,
          latitude: this.selectedAddress.latitude,
          longitude: this.selectedAddress.longitude,
        },
        role: this.role,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (token) => {
          if (token) {
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/tabs/home';
            void this.router.navigateByUrl(returnUrl);
            return;
          }

          void this.router.navigate(['/login'], {
            queryParams: {
              registered: 'true',
            },
          });
        },
        error: (error: Error) => {
          this.errorMessage = error.message;
        },
      });
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'CUSTOMER' | 'PARTNER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN';

export interface AuthUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  addressDetails?: Partial<RegisterAddressPayload>;
  role?: UserRole;
}

export interface RegisterAddressPayload {
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  defaultAddress: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address: string;
  addressDetails: RegisterAddressPayload;
  role: UserRole;
}

interface LoginResponse {
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: AuthUser;
  data?: {
    token?: string;
    accessToken?: string;
    jwt?: string;
    user?: AuthUser;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly cookieName = 'gravity_auth_token';
  private readonly userStorageKey = 'gravity_current_user';
  private readonly tokenMaxAgeSeconds = 60 * 60 * 24 * 7;
  private readonly loginUrl = `${environment.apiBaseUrl}/api/auth/login`;
  private readonly registerUrl = `${environment.apiBaseUrl}/api/auth/register`;
  private readonly currentUserUrl = environment.currentUserUrl;

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<string> {
    this.clearStoredUser();

    const credentials: LoginCredentials = {
      email: email.trim(),
      password,
    };

    if (!credentials.email || !credentials.password.trim()) {
      return throwError(() => new Error('Email et mot de passe requis.'));
    }

    return this.http.post<LoginResponse>(this.loginUrl, credentials).pipe(
      tap((response) => this.storeUserFromResponse(response)),
      map((response) => this.extractToken(response)),
      tap((token) => this.setToken(token)),
      switchMap((token) => this.getCurrentUser().pipe(map(() => token))),
      catchError((error: unknown) => throwError(() => this.normalizeLoginError(error))),
    );
  }

  register(payload: RegisterPayload): Observable<string | null> {
    const registerPayload: RegisterPayload = {
      email: payload.email.trim(),
      password: payload.password,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      address: payload.address.trim(),
      addressDetails: {
        label: payload.addressDetails.label.trim(),
        line1: payload.addressDetails.line1.trim(),
        line2: payload.addressDetails.line2?.trim() || null,
        city: payload.addressDetails.city.trim(),
        postalCode: payload.addressDetails.postalCode.trim(),
        country: payload.addressDetails.country.trim(),
        defaultAddress: payload.addressDetails.defaultAddress,
        latitude: payload.addressDetails.latitude,
        longitude: payload.addressDetails.longitude,
      },
      role: payload.role,
    };

    if (
      !registerPayload.email ||
      !registerPayload.password.trim() ||
      !registerPayload.firstName ||
      !registerPayload.lastName ||
      !registerPayload.address ||
      !registerPayload.addressDetails.label ||
      !registerPayload.addressDetails.line1 ||
      !registerPayload.addressDetails.city ||
      !registerPayload.addressDetails.postalCode ||
      !registerPayload.addressDetails.country
    ) {
      return throwError(() => new Error('Tous les champs sont requis.'));
    }

    return this.http.post<LoginResponse>(this.registerUrl, registerPayload).pipe(
      tap((response) => {
        const responseUser = this.extractUser(response);

        const fallbackUser: AuthUser = {
          email: registerPayload.email,
          firstName: registerPayload.firstName,
          lastName: registerPayload.lastName,
          address: registerPayload.address,
          addressDetails: registerPayload.addressDetails,
          role: registerPayload.role,
        };

        this.storeUser(responseUser ? this.mergeUsers(responseUser, fallbackUser) : fallbackUser);
      }),
      map((response) => this.extractOptionalToken(response)),
      tap((token) => {
        if (token) {
          this.setToken(token);
        }
      }),
      catchError((error: unknown) => throwError(() => this.normalizeRegisterError(error))),
    );
  }

  getCurrentUser(): Observable<AuthUser | null> {
    const cachedUser = this.getCachedUser();

    if (cachedUser || !this.getToken() || !this.currentUserUrl.trim()) {
      return of(cachedUser);
    }

    return this.http.get<unknown>(this.currentUserUrl).pipe(
      map((response) => this.extractUser(response)),
      tap((user) => {
        if (user) {
          this.storeUser(user);
        }
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          return of(this.getCachedUser());
        }

        return of(this.getCachedUser());
      }),
    );
  }

  getCachedUser(): AuthUser | null {
    const storage = this.getLocalStorage();

    if (!storage) {
      return null;
    }

    const value = storage.getItem(this.userStorageKey);

    if (!value) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(value);

      return this.isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  logout(): void {
    this.clearToken();
    this.clearStoredUser();
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    return Boolean(token && token.trim().length > 0);
  }

  getToken(): string | null {
    const documentRef = this.getDocument();

    if (!documentRef?.cookie) {
      return null;
    }

    const cookie = documentRef.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${this.cookieName}=`));

    if (!cookie) {
      return null;
    }

    const encodedValue = cookie.substring(this.cookieName.length + 1);

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    const documentRef = this.getDocument();

    if (!documentRef) {
      return;
    }

    const secureFlag = this.isHttps() ? '; Secure' : '';

    documentRef.cookie = [
      `${this.cookieName}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${this.tokenMaxAgeSeconds}`,
      'SameSite=Lax',
    ].join('; ') + secureFlag;
  }

  clearToken(): void {
    const documentRef = this.getDocument();

    if (!documentRef) {
      return;
    }

    documentRef.cookie = `${this.cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  private extractToken(response: LoginResponse): string {
    const token =
      response.token ||
      response.accessToken ||
      response.jwt ||
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.jwt;

    if (!token) {
      throw new Error('Token absent dans la reponse de connexion.');
    }

    return token;
  }

  private extractOptionalToken(response: LoginResponse | null): string | null {
    if (!response) {
      return null;
    }

    return (
      response.token ||
      response.accessToken ||
      response.jwt ||
      response.data?.token ||
      response.data?.accessToken ||
      response.data?.jwt ||
      null
    );
  }

  private storeUserFromResponse(response: LoginResponse | null): void {
    const user = this.extractUser(response);

    if (user) {
      this.storeUser(user);
    }
  }

  private extractUser(response: unknown): AuthUser | null {
    if (!this.isRecord(response)) {
      return null;
    }

    const user = response['user'];

    if (this.isRecord(user)) {
      return this.normalizeUser(user, response);
    }

    const data = response['data'];

    if (this.isRecord(data)) {
      const dataUser = data['user'];

      if (this.isRecord(dataUser)) {
        return this.normalizeUser(dataUser, data);
      }

      if (this.looksLikeUserOrAddress(data)) {
        return this.normalizeUser(data);
      }
    }

    const result = response['result'];

    if (this.isRecord(result)) {
      const resultUser = result['user'];

      if (this.isRecord(resultUser)) {
        return this.normalizeUser(resultUser, result);
      }

      if (this.looksLikeUserOrAddress(result)) {
        return this.normalizeUser(result);
      }
    }

    const profile = response['profile'] ?? response['customer'] ?? response['account'];

    if (this.isRecord(profile)) {
      return this.normalizeUser(profile, response);
    }

    if (this.looksLikeUserOrAddress(response)) {
      return this.normalizeUser(response);
    }

    return null;
  }

  private normalizeUser(source: Record<string, unknown>, parent?: Record<string, unknown>): AuthUser {
    const addressDetails = this.extractAddressDetails(source) ?? this.extractAddressDetails(parent);
    const address = this.extractAddressText(source) ?? this.extractAddressText(parent) ?? this.formatAddress(addressDetails);

    return {
      id: this.readString(source['id']),
      email: this.readString(source['email']),
      firstName: this.readString(source['firstName'] ?? source['first_name']),
      lastName: this.readString(source['lastName'] ?? source['last_name']),
      phone: this.readString(source['phone']),
      address,
      addressDetails: addressDetails ?? undefined,
      role: this.readUserRole(source['role']),
    };
  }

  private looksLikeUserOrAddress(value: Record<string, unknown>): boolean {
    return Boolean(
      value['email'] ||
      value['firstName'] ||
      value['first_name'] ||
      value['address'] ||
      value['addressDetails'] ||
      value['address_details'] ||
      value['addresses'] ||
      value['location'] ||
      value['coordinates'] ||
      value['line1'] ||
      value['street'] ||
      value['streetAddress'] ||
      value['street_address'] ||
      value['postalCode'] ||
      value['postal_code'] ||
      value['zipCode'] ||
      value['zip_code'] ||
      value['latitude'] ||
      value['lat'],
    );
  }

  private extractAddressText(value: Record<string, unknown> | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const directAddress = this.readString(
      value['address'] ?? value['addressLabel'] ?? value['address_label'] ?? value['fullAddress'] ?? value['full_address'],
    );

    if (directAddress) {
      return directAddress;
    }

    const nestedAddress = value['address'];

    if (this.isRecord(nestedAddress)) {
      const nestedAddressText = this.extractAddressText(nestedAddress);

      if (nestedAddressText) {
        return nestedAddressText;
      }
    }

    const addressDetails = this.extractAddressDetails(value);

    return this.formatAddress(addressDetails);
  }

  private extractAddressDetails(value: Record<string, unknown> | undefined): Partial<RegisterAddressPayload> | null {
    if (!value) {
      return null;
    }

    const directAddressDetails =
      value['addressDetails'] ??
      value['address_details'] ??
      value['defaultAddress'] ??
      value['default_address'] ??
      value['address'];

    if (this.isRecord(directAddressDetails)) {
      return this.normalizeAddressDetails(directAddressDetails);
    }

    const addresses = value['addresses'];

    if (Array.isArray(addresses)) {
      const defaultAddress = addresses.find((address) => this.isRecord(address) && this.isDefaultAddress(address));
      const firstAddress = addresses.find((address) => this.isRecord(address));
      const selectedAddress = defaultAddress ?? firstAddress;

      if (this.isRecord(selectedAddress)) {
        return this.normalizeAddressDetails(selectedAddress);
      }
    }

    if (
      value['line1'] ||
      value['street'] ||
      value['streetAddress'] ||
      value['street_address'] ||
      value['postalCode'] ||
      value['postal_code'] ||
      value['zipCode'] ||
      value['zip_code'] ||
      value['city'] ||
      value['location'] ||
      value['coordinates'] ||
      value['latitude'] ||
      value['lat']
    ) {
      return this.normalizeAddressDetails(value);
    }

    return null;
  }

  private normalizeAddressDetails(value: Record<string, unknown>): Partial<RegisterAddressPayload> {
    return {
      label: this.readString(value['label'] ?? value['name']),
      line1: this.readString(value['line1'] ?? value['street'] ?? value['streetAddress'] ?? value['street_address']),
      line2: this.readNullableString(value['line2'] ?? value['additionalAddress'] ?? value['additional_address']),
      city: this.readString(value['city'] ?? value['locality']),
      postalCode: this.readString(value['postalCode'] ?? value['postal_code'] ?? value['zipCode'] ?? value['zip_code']),
      country: this.readString(value['country']),
      defaultAddress: this.isDefaultAddress(value),
      latitude: this.readLatitude(value),
      longitude: this.readLongitude(value),
    };
  }

  private formatAddress(addressDetails: Partial<RegisterAddressPayload> | null): string | undefined {
    if (!addressDetails) {
      return undefined;
    }

    const cityLine = [addressDetails.postalCode, addressDetails.city].filter(Boolean).join(' ');
    const address = [addressDetails.line1, cityLine, addressDetails.country].filter(Boolean).join(', ');

    return address || undefined;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private readUserRole(value: unknown): UserRole | undefined {
    return value === 'CUSTOMER' ||
      value === 'PARTNER' ||
      value === 'RESTAURANT_OWNER' ||
      value === 'COURIER' ||
      value === 'ADMIN'
      ? value
      : undefined;
  }

  private isDefaultAddress(value: Record<string, unknown>): boolean {
    return (
      value['defaultAddress'] === true ||
      value['default_address'] === true ||
      value['isDefault'] === true ||
      value['is_default'] === true ||
      value['default'] === true
    );
  }

  private readLatitude(value: Record<string, unknown>): number | null {
    const directLatitude = this.readNumber(value['latitude'] ?? value['lat'] ?? value['y']);

    if (directLatitude !== null) {
      return directLatitude;
    }

    const location = value['location'] ?? value['coordinates'] ?? value['position'] ?? value['geo'];

    if (this.isRecord(location)) {
      const nestedLatitude = this.readNumber(location['latitude'] ?? location['lat'] ?? location['y']);

      if (nestedLatitude !== null) {
        return nestedLatitude;
      }

      const coordinates = location['coordinates'];

      if (Array.isArray(coordinates)) {
        return this.readNumber(coordinates[1]);
      }
    }

    if (Array.isArray(location)) {
      return this.readNumber(location[1]);
    }

    return null;
  }

  private readLongitude(value: Record<string, unknown>): number | null {
    const directLongitude = this.readNumber(value['longitude'] ?? value['lng'] ?? value['lon'] ?? value['long'] ?? value['x']);

    if (directLongitude !== null) {
      return directLongitude;
    }

    const location = value['location'] ?? value['coordinates'] ?? value['position'] ?? value['geo'];

    if (this.isRecord(location)) {
      const nestedLongitude = this.readNumber(
        location['longitude'] ?? location['lng'] ?? location['lon'] ?? location['long'] ?? location['x'],
      );

      if (nestedLongitude !== null) {
        return nestedLongitude;
      }

      const coordinates = location['coordinates'];

      if (Array.isArray(coordinates)) {
        return this.readNumber(coordinates[0]);
      }
    }

    if (Array.isArray(location)) {
      return this.readNumber(location[0]);
    }

    return null;
  }

  private mergeUsers(user: AuthUser, fallback: AuthUser): AuthUser {
    return {
      ...fallback,
      ...user,
      address: user.address ?? fallback.address,
      addressDetails: user.addressDetails ?? fallback.addressDetails,
      role: user.role ?? fallback.role,
    };
  }

  private storeUser(user: AuthUser): void {
    const storage = this.getLocalStorage();

    if (!storage) {
      return;
    }

    storage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  private clearStoredUser(): void {
    this.getLocalStorage()?.removeItem(this.userStorageKey);
  }

  private normalizeLoginError(error: unknown): Error {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new Error('Impossible de joindre le serveur de connexion.');
      }

      if (error.status === 401) {
        return new Error('Email ou mot de passe incorrect.');
      }

      const backendMessage = this.extractBackendMessage(error.error);

      if (backendMessage) {
        return new Error(backendMessage);
      }
    }

    return new Error('La connexion a echoue. Reessaie dans quelques instants.');
  }

  private normalizeRegisterError(error: unknown): Error {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new Error("Impossible de joindre le serveur d'inscription.");
      }

      const backendMessage = this.extractBackendMessage(error.error);

      if (backendMessage) {
        return new Error(backendMessage);
      }
    }

    return new Error("L'inscription a echoue. Reessaie dans quelques instants.");
  }

  private extractBackendMessage(errorBody: unknown): string | null {
    if (typeof errorBody === 'string' && errorBody.trim()) {
      return errorBody;
    }

    if (this.isRecord(errorBody)) {
      const message = errorBody['message'] || errorBody['error'];

      return typeof message === 'string' && message.trim() ? message : null;
    }

    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getDocument(): Document | null {
    return typeof document === 'undefined' ? null : document;
  }

  private isHttps(): boolean {
    return typeof location !== 'undefined' && location.protocol === 'https:';
  }

  private getLocalStorage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
}

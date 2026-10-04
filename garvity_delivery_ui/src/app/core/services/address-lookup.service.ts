import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

export interface AddressSuggestion {
  id: string;
  label: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
  longitude: number | null;
  latitude: number | null;
}

interface GeoplatformCompletionResponse {
  results?: GeoplatformCompletionResult[];
}

interface GeoplatformCompletionResult {
  fulltext?: string;
  street?: string;
  name?: string;
  city?: string;
  zipcode?: string;
  postalCode?: string;
  x?: number;
  y?: number;
}

interface NominatimSearchResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AddressLookupService {
  private readonly completionUrl = 'https://data.geopf.fr/geocodage/completion/';
  private readonly nominatimSearchUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private readonly http: HttpClient) {}

  searchFrenchAddresses(query: string): Observable<AddressSuggestion[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return of([]);
    }

    if (this.isTunisianAddress(trimmedQuery)) {
      return this.searchGlobalAddresses(trimmedQuery);
    }

    const params = new HttpParams()
      .set('text', trimmedQuery)
      .set('terr', 'METROPOLE,DOMTOM')
      .set('type', 'StreetAddress')
      .set('maximumResponses', '6');

    return this.http.get<GeoplatformCompletionResponse>(this.completionUrl, { params }).pipe(
      map((response) => response.results ?? []),
      map((results) => results.map((result, index) => this.toSuggestion(result, index))),
      map((suggestions) => suggestions.filter((suggestion) => suggestion.label && suggestion.city)),
      switchMap((suggestions) => (suggestions.length ? of(suggestions) : this.searchGlobalAddresses(trimmedQuery))),
      catchError(() => this.searchGlobalAddresses(trimmedQuery)),
    );
  }

  private searchGlobalAddresses(query: string): Observable<AddressSuggestion[]> {
    let params = new HttpParams()
      .set('q', query)
      .set('format', 'jsonv2')
      .set('addressdetails', '1')
      .set('limit', '6');

    if (this.isTunisianAddress(query)) {
      params = params.set('countrycodes', 'tn');
    }

    return this.http.get<NominatimSearchResult[]>(this.nominatimSearchUrl, { params }).pipe(
      map((results) => results.map((result, index) => this.toGlobalSuggestion(result, index))),
      map((suggestions) => suggestions.filter((suggestion) => suggestion.label && suggestion.latitude !== null && suggestion.longitude !== null)),
      catchError(() => of([])),
    );
  }

  private toSuggestion(result: GeoplatformCompletionResult, index: number): AddressSuggestion {
    const label = (result.fulltext || result.name || result.street || '').trim();
    const line1 = (result.street || result.name || label.split(',')[0] || label).trim();
    const postalCode = (result.zipcode || result.postalCode || this.extractPostalCode(label)).trim();
    const city = (result.city || this.extractCity(label, postalCode)).trim();

    return {
      id: `${label}-${postalCode}-${city}-${index}`,
      label,
      line1,
      city,
      postalCode,
      country: 'France',
      longitude: typeof result.x === 'number' ? result.x : null,
      latitude: typeof result.y === 'number' ? result.y : null,
    };
  }

  private toGlobalSuggestion(result: NominatimSearchResult, index: number): AddressSuggestion {
    const address = result.address ?? {};
    const label = (result.display_name || '').trim();
    const line1 = (
      address.road ||
      address.pedestrian ||
      address.neighbourhood ||
      address.suburb ||
      label.split(',')[0] ||
      label
    ).trim();
    const city = (
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.state ||
      address.county ||
      ''
    ).trim();
    const latitude = this.readNumber(result.lat);
    const longitude = this.readNumber(result.lon);

    return {
      id: `${label}-${index}`,
      label,
      line1,
      city,
      postalCode: address.postcode ?? '',
      country: address.country ?? '',
      latitude,
      longitude,
    };
  }

  private isTunisianAddress(query: string): boolean {
    const normalized = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized.includes('tunis') || normalized.includes('tunisie') || normalized.includes('tunisia');
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

  private extractPostalCode(label: string): string {
    return label.match(/\b\d{5}\b/)?.[0] ?? '';
  }

  private extractCity(label: string, postalCode: string): string {
    if (!postalCode) {
      return '';
    }

    const cityPart = label.split(postalCode)[1];

    return cityPart?.replace(/^[\s,]+/, '').trim() ?? '';
  }
}

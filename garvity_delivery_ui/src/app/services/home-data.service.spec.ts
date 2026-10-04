import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { HomeDataService, Restaurant } from './home-data.service';

describe('HomeDataService', () => {
  let service: HomeDataService;
  let httpTesting: HttpTestingController;

  const restaurants: Restaurant[] = [
    {
      id: 1,
      name: 'Burger House',
      categoryId: 'burger',
      rating: '4.8',
      reviews: '1,2k',
      kind: 'Burger',
      priceLevel: '$$',
      fee: 'Frais 1,99 EUR',
      eta: 'Livraison 20-30 min',
      initials: 'BH',
      image: 'assets/gravity/burger-card-v2.png',
      address: '18 Rue de Rivoli, 75004 Paris, France',
    },
    {
      id: 2,
      name: 'Sushi Daily',
      categoryId: 'sushi',
      rating: '4.7',
      reviews: '856',
      kind: 'Japonais',
      priceLevel: '$$',
      fee: 'Frais 0,99 EUR',
      eta: 'Livraison 25-36 min',
      initials: 'SD',
      image: 'assets/gravity/sushi-card-v2.png',
      address: '12 Rue Sainte-Anne, 75001 Paris, France',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(HomeDataService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('returns every restaurant for the all category', () => {
    expect(service.filterRestaurants(restaurants, 'all')).toEqual(restaurants);
  });

  it('returns only restaurants matching the selected category', () => {
    expect(service.filterRestaurants(restaurants, 'burger')).toEqual([restaurants[0]]);
  });

  it('returns restaurants matching any selected category', () => {
    expect(service.filterRestaurants(restaurants, ['burger', 'sushi'])).toEqual(restaurants);
  });

  it('keeps Tous first and exposes every configured restaurant category', (done) => {
    service.getHomeData().subscribe((data) => {
      expect(data.categories[0]).toEqual({ id: 'all', label: 'Tous', icon: 'grid-outline' });
      expect(data.categories.map((category) => category.id)).toContain('kebab');
      expect(data.categories.map((category) => category.id)).toContain('indien');
      expect(data.categories.map((category) => category.id)).toContain('chinois');
      expect(data.restaurants[0].name).toBe('Kebab Station');
      done();
    });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/api/public/restaurants`);

    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'restaurant-kebab',
        name: 'Kebab Station',
        cuisineType: 'Kebab',
      },
    ]);
  });

  it('filters restaurants with newly supported categories', () => {
    const kebabRestaurant: Restaurant = {
      id: 3,
      name: 'Kebab Station',
      categoryId: 'kebab',
      rating: '4.5',
      reviews: '642',
      kind: 'Kebab',
      priceLevel: '$',
      fee: 'Frais 1,29 EUR',
      eta: 'Livraison 18-28 min',
      initials: 'KS',
      image: 'assets/gravity/burger-house.png',
      address: '22 Boulevard Voltaire, 75011 Paris, France',
    };

    expect(service.filterRestaurants([...restaurants, kebabRestaurant], 'kebab')).toEqual([kebabRestaurant]);
  });

  it('adds categories returned by the restaurant API when they are not preconfigured', () => {
    const restaurantsWithNewCategory: Restaurant[] = [
      {
        ...restaurants[0],
        categoryId: 'creole',
        kind: 'Creole',
      },
    ];

    expect(service.getRestaurantCategories(restaurantsWithNewCategory).map((category) => category.id)).toContain('creole');
  });

  it('calls the nearby restaurants search endpoint with a 10 km radius', () => {
    service.getNearbyRestaurants(48.8566, 2.3522).subscribe((result) => {
      expect(result[0].name).toBe('Sushi Daily');
      expect(result[0].categoryId).toBe('sushi');
    });

    const request = httpTesting.expectOne(
      (req) => req.url === `${environment.apiBaseUrl}/api/restaurants/search`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('latitude')).toBe('48.8566');
    expect(request.request.params.get('longitude')).toBe('2.3522');
    expect(request.request.params.get('radiusKm')).toBe('10');

    request.flush([
      {
        id: 'restaurant-2',
        name: 'Sushi Daily',
        category: 'Japonais',
      },
    ]);
  });

  it('uses cuisineType as the visible restaurant category', () => {
    service.getNearbyRestaurants(48.8566, 2.3522).subscribe((result) => {
      expect(result[0].name).toBe('Trocadero Sushi');
      expect(result[0].kind).toBe('Japanese');
      expect(result[0].categoryId).toBe('sushi');
    });

    const request = httpTesting.expectOne(
      (req) => req.url === `${environment.apiBaseUrl}/api/restaurants/search`,
    );

    request.flush([
      {
        id: '00000000-0000-4000-8000-500000000017',
        name: 'Trocadero Sushi',
        cuisineType: 'Japanese',
        address: {
          label: 'Restaurant',
          line1: '5 Avenue Kleber',
          city: 'Paris',
          postalCode: '75116',
          country: 'France',
        },
      },
    ]);
  });

  it('maps English cuisineType values to the matching French category filters', () => {
    service.getNearbyRestaurants(48.8566, 2.3522).subscribe((result) => {
      expect(result.map((restaurant) => restaurant.categoryId)).toEqual(['libanais', 'thailandais']);
      expect(service.filterRestaurants(result, 'libanais')[0].name).toBe('Beirut Table');
      expect(service.filterRestaurants(result, 'thailandais')[0].name).toBe('Bangkok Street');
    });

    const request = httpTesting.expectOne(
      (req) => req.url === `${environment.apiBaseUrl}/api/restaurants/search`,
    );

    request.flush([
      {
        id: 'restaurant-lebanese',
        name: 'Beirut Table',
        cuisineType: 'Lebanese',
      },
      {
        id: 'restaurant-thai',
        name: 'Bangkok Street',
        cuisineType: 'Thai',
      },
    ]);
  });

});

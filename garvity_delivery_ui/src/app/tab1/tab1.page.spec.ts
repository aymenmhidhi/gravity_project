import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Tab1Page } from './tab1.page';
import { AddressLookupService } from '../core/services/address-lookup.service';
import { AuthService } from '../core/services/auth.service';
import { HomeDataService } from '../services/home-data.service';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;
  let homeDataServiceMock: {
    getHomeData: jasmine.Spy;
    getHomeDataForAddress: jasmine.Spy;
    getNearbyRestaurants: jasmine.Spy;
    filterRestaurants: jasmine.Spy;
    getRestaurantCategories: jasmine.Spy;
    getRestaurantCategoryIcon: jasmine.Spy;
    getRestaurantCategoryLabel: jasmine.Spy;
  };
  let addressLookupServiceMock: {
    searchFrenchAddresses: jasmine.Spy;
  };
  let authServiceMock: {
    isAuthenticated: jasmine.Spy;
    getCurrentUser: jasmine.Spy;
  };
  let routerMock: {
    navigate: jasmine.Spy;
  };

  beforeEach(async () => {
    homeDataServiceMock = {
      getHomeData: jasmine.createSpy('getHomeData').and.returnValue(
        of({
          categories: [
            { id: 'all', label: 'Tous', icon: 'grid-outline' },
            { id: 'burger', label: 'Burger', icon: 'fast-food-outline' },
          ],
          restaurants: [
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
          ],
        }),
      ),
      getHomeDataForAddress: jasmine
        .createSpy('getHomeDataForAddress')
        .and.returnValue(of({ categories: [], restaurants: [] })),
      getNearbyRestaurants: jasmine.createSpy('getNearbyRestaurants').and.returnValue(of([])),
      filterRestaurants: jasmine.createSpy('filterRestaurants').and.callFake((restaurants) => restaurants),
      getRestaurantCategories: jasmine.createSpy('getRestaurantCategories').and.callFake((_restaurants, categories) => categories),
      getRestaurantCategoryIcon: jasmine.createSpy('getRestaurantCategoryIcon').and.returnValue('fast-food-outline'),
      getRestaurantCategoryLabel: jasmine.createSpy('getRestaurantCategoryLabel').and.returnValue('Burger'),
    };
    authServiceMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(
        of({
          address: '5 Avenue de la Republique, 78500 Sartrouville',
          addressDetails: {
            line1: 'Avenue de la Republique',
            city: 'Sartrouville',
            postalCode: '78500',
            country: 'France',
          },
        }),
      ),
    };
    addressLookupServiceMock = {
      searchFrenchAddresses: jasmine.createSpy('searchFrenchAddresses').and.returnValue(
        of([
          {
            latitude: 48.9372,
            longitude: 2.1647,
          },
        ]),
      ),
    };
    routerMock = {
      navigate: jasmine.createSpy('navigate').and.resolveTo(true),
    };

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: HomeDataService,
          useValue: homeDataServiceMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: AddressLookupService,
          useValue: addressLookupServiceMock,
        },
        {
          provide: Router,
          useValue: routerMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the cached customer address', () => {
    expect(component.displayedDeliveryAddress).toBe('5 Avenue de la Republique, 78500 Sartrouville');
  });

  it('should load restaurants using coordinates resolved from the customer address', () => {
    expect(addressLookupServiceMock.searchFrenchAddresses).toHaveBeenCalledWith(
      '5 Avenue de la Republique, 78500 Sartrouville',
    );
    expect(homeDataServiceMock.getNearbyRestaurants).toHaveBeenCalledWith(48.9372, 2.1647);
  });

  it('should keep restaurants empty when nearby search returns no restaurants', () => {
    expect(component.filteredRestaurants).toEqual([]);
  });

  it('should navigate to cart when choosing a restaurant', () => {
    component.chooseRestaurant(component.filteredRestaurants[0]);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/tabs/cart']);
  });
});

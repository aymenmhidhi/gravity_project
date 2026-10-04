import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Tab2Page } from './tab2.page';
import { HomeDataService } from '../services/home-data.service';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;
  let homeDataServiceMock: {
    filterRestaurants: jasmine.Spy;
    getHomeData: jasmine.Spy;
  };

  beforeEach(async () => {
    homeDataServiceMock = {
      filterRestaurants: jasmine.createSpy('filterRestaurants').and.callFake((restaurants, categoryId) =>
        categoryId === 'all' ? restaurants : restaurants.filter((restaurant: { categoryId: string }) => restaurant.categoryId === categoryId),
      ),
      getHomeData: jasmine.createSpy('getHomeData').and.returnValue(
        of({
          categories: [
            { id: 'all', label: 'Tous', icon: 'grid-outline' },
            { id: 'sushi', label: 'Sushi', icon: 'fish-outline' },
            { id: 'healthy', label: 'Healthy', icon: 'leaf-outline' },
            { id: 'libanais', label: 'Libanais', icon: 'leaf-outline' },
            { id: 'thailandais', label: 'Thailandais', icon: 'flower-outline' },
          ],
          restaurants: [
            {
              id: 1,
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
          ],
        }),
      ),
    };

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: HomeDataService,
          useValue: homeDataServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search categories using their label', () => {
    component.searchCategories('sushi');

    expect(component.filteredCategories).toEqual([{ id: 'sushi', label: 'Sushi', icon: 'fish-outline' }]);
  });

  it('should display restaurants returned by the data service', () => {
    expect(component.filteredRestaurants[0].name).toBe('Sushi Daily');
  });

  it('should include the same Libanais and Thailandais categories as the management page', () => {
    expect(component.categories).toContain({ id: 'libanais', label: 'Libanais', icon: 'leaf-outline' });
    expect(component.categories).toContain({ id: 'thailandais', label: 'Thailandais', icon: 'flower-outline' });
  });
});

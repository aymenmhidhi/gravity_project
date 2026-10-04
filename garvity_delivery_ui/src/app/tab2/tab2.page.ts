import { Component, OnInit, inject } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cafeOutline,
  fastFoodOutline,
  fishOutline,
  flameOutline,
  flowerOutline,
  gridOutline,
  iceCreamOutline,
  leafOutline,
  nutritionOutline,
  pizzaOutline,
  restaurantOutline,
  searchOutline,
  storefrontOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { TranslationService } from '../core/i18n/translation.service';
import { Category, HomeDataService, Restaurant } from '../services/home-data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonContent, IonIcon],
})
export class Tab2Page implements OnInit {
  private readonly homeDataService = inject(HomeDataService);
  readonly i18n = inject(TranslationService);

  categories: Category[] = [];
  filteredCategories: Category[] = [];
  restaurants: Restaurant[] = [];
  filteredRestaurants: Restaurant[] = [];
  searchQuery = '';
  selectedCategoryId = 'all';

  constructor() {
    addIcons({
      cafeOutline,
      fastFoodOutline,
      fishOutline,
      flameOutline,
      flowerOutline,
      gridOutline,
      iceCreamOutline,
      leafOutline,
      nutritionOutline,
      pizzaOutline,
      restaurantOutline,
      searchOutline,
      storefrontOutline,
      sunnyOutline,
    });
  }

  ngOnInit(): void {
    this.homeDataService.getHomeData().subscribe((data) => {
      this.categories = data.categories;
      this.restaurants = data.restaurants;
      this.applySearch();
    });
  }

  searchCategories(value: string): void {
    this.searchQuery = value;
    this.applySearch();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.applySearch();
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategoryId === categoryId;
  }

  getCategoryIcon(categoryId: string): string {
    return this.categories.find((category) => category.id === categoryId)?.icon ?? 'restaurant-outline';
  }

  private applySearch(): void {
    const normalizedQuery = this.searchQuery.trim().toLowerCase();

    this.filteredCategories = normalizedQuery
      ? this.categories.filter((category) =>
          [category.label, category.id].some((value) => value.toLowerCase().includes(normalizedQuery)),
        )
      : this.categories;

    const categoryRestaurants = this.homeDataService.filterRestaurants(this.restaurants, this.selectedCategoryId);

    this.filteredRestaurants = normalizedQuery
      ? categoryRestaurants.filter((restaurant) =>
          [restaurant.name, restaurant.kind, restaurant.categoryId, restaurant.address].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
        )
      : categoryRestaurants;
  }
}

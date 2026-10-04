import { Routes } from '@angular/router';
import { restaurantOwnerGuard } from '../core/guards/restaurant-owner.guard';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab1',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: 'tab3',
        redirectTo: '/tabs/cart',
        pathMatch: 'full',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('../pages/customer-orders/customer-orders.page').then((m) => m.CustomerOrdersPage),
      },
      {
        path: 'restaurant-owner',
        canActivate: [restaurantOwnerGuard],
        loadComponent: () =>
          import('../pages/restaurant-owner/restaurant-owner.page').then((m) => m.RestaurantOwnerPage),
      },
      {
        path: 'restaurant-owner/:restaurantId',
        canActivate: [restaurantOwnerGuard],
        loadComponent: () =>
          import('../pages/restaurant-owner/restaurant-owner.page').then((m) => m.RestaurantOwnerPage),
      },
      {
        path: 'rider',
        loadComponent: () =>
          import('../pages/rider-workflow/rider-workflow.page').then((m) => m.RiderWorkflowPage),
      },
      {
        path: 'tab5',
        loadComponent: () =>
          import('../tab5/tab5.page').then((m) => m.Tab5Page),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];

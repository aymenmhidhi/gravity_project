import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'fr' | 'en' | 'ar';

type TranslationKey =
  | 'app.name'
  | 'language.label'
  | 'language.fr'
  | 'language.en'
  | 'language.ar'
  | 'auth.secureAccess'
  | 'auth.loginTitle'
  | 'auth.email'
  | 'auth.password'
  | 'auth.loginButton'
  | 'auth.loginLoading'
  | 'auth.forgotPassword'
  | 'auth.createAccount'
  | 'auth.newUser'
  | 'auth.registerTitle'
  | 'auth.firstName'
  | 'auth.lastName'
  | 'auth.address'
  | 'auth.addressPlaceholder'
  | 'auth.addressSearching'
  | 'auth.userType'
  | 'auth.registerButton'
  | 'auth.registerLoading'
  | 'auth.alreadyAccount'
  | 'auth.emailPlaceholder'
  | 'auth.registerEmailPlaceholder'
  | 'auth.passwordPlaceholder'
  | 'role.CUSTOMER'
  | 'role.PARTNER'
  | 'role.RESTAURANT_OWNER'
  | 'role.COURIER'
  | 'role.ADMIN'
  | 'tabs.home'
  | 'tabs.search'
  | 'tabs.cart'
  | 'tabs.orders'
  | 'tabs.restaurantOwner'
  | 'tabs.profile'
  | 'home.mainNavigation'
  | 'home.menu'
  | 'home.notifications'
  | 'home.changeAddress'
  | 'home.heroAlt'
  | 'home.search'
  | 'home.searchPlaceholder'
  | 'home.filters'
  | 'home.categories'
  | 'home.all'
  | 'home.popularRestaurants'
  | 'home.addRestaurant'
  | 'home.emptyTitle'
  | 'home.emptyCopy'
  | 'home.offers'
  | 'home.offerCta'
  | 'home.offerTitle'
  | 'home.offerCode'
  | 'profile.userProfile'
  | 'profile.activeSession'
  | 'profile.title'
  | 'profile.copy'
  | 'profile.cookieToken'
  | 'profile.logout'
  | 'placeholder.searchTitle'
  | 'placeholder.ordersTitle';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  fr: {
    'app.name': 'Gravity',
    'language.label': 'Langue',
    'language.fr': 'Français',
    'language.en': 'Anglais',
    'language.ar': 'Arabe',
    'auth.secureAccess': 'Accès sécurisé',
    'auth.loginTitle': 'Connexion',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.loginButton': 'Se connecter',
    'auth.loginLoading': 'Connexion...',
    'auth.forgotPassword': 'Mot de passe oublié',
    'auth.createAccount': 'Créer un compte',
    'auth.newUser': 'Nouveau client',
    'auth.registerTitle': 'Inscription',
    'auth.firstName': 'Prénom',
    'auth.lastName': 'Nom',
    'auth.address': 'Adresse',
    'auth.addressPlaceholder': 'Commencez a taper votre adresse',
    'auth.addressSearching': 'Recherche adresse...',
    'auth.userType': "Type d'utilisateur",
    'auth.registerButton': 'Créer un compte',
    'auth.registerLoading': 'Création...',
    'auth.alreadyAccount': "J'ai déjà un compte",
    'auth.emailPlaceholder': 'admin@gravity.app',
    'auth.registerEmailPlaceholder': 'client@gravity.app',
    'auth.passwordPlaceholder': 'Votre mot de passe',
    'role.CUSTOMER': 'Client',
    'role.PARTNER': 'Partenaire',
    'role.RESTAURANT_OWNER': 'Propriétaire restaurant',
    'role.COURIER': 'Livreur',
    'role.ADMIN': 'Administrateur',
    'tabs.home': 'Accueil',
    'tabs.search': 'Recherche',
    'tabs.cart': 'Panier',
    'tabs.orders': 'Commande',
    'tabs.restaurantOwner': 'Gestion',
    'tabs.profile': 'Profil',
    'home.mainNavigation': 'Navigation principale',
    'home.menu': 'Menu',
    'home.notifications': 'Notifications',
    'home.changeAddress': "Changer l'adresse de livraison",
    'home.heroAlt': 'Drone Gravity transportant une commande',
    'home.search': 'Recherche',
    'home.searchPlaceholder': 'Rechercher un restaurant ou un plat',
    'home.filters': 'Filtres',
    'home.categories': 'Catégories',
    'home.all': 'Voir tout',
    'home.popularRestaurants': 'Restaurants populaires',
    'home.addRestaurant': 'Ajouter',
    'home.emptyTitle': 'Aucun restaurant',
    'home.emptyCopy': 'Essaie une autre catégorie.',
    'home.offers': 'Offres du moment',
    'home.offerCta': "Voir l'offre du moment",
    'home.offerTitle': '-20% sur votre 1ère commande',
    'home.offerCode': 'Utilisez le code',
    'profile.userProfile': 'Profil utilisateur',
    'profile.activeSession': 'Session active',
    'profile.title': 'Profil',
    'profile.copy': 'Authentification Gravity active via cookie sécurisé côté front.',
    'profile.cookieToken': 'Token cookie',
    'profile.logout': 'Se déconnecter',
    'placeholder.searchTitle': 'Recherche',
    'placeholder.ordersTitle': 'Commandes',
  },
  en: {
    'app.name': 'Gravity',
    'language.label': 'Language',
    'language.fr': 'French',
    'language.en': 'English',
    'language.ar': 'Arabic',
    'auth.secureAccess': 'Secure access',
    'auth.loginTitle': 'Sign in',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.loginButton': 'Sign in',
    'auth.loginLoading': 'Signing in...',
    'auth.forgotPassword': 'Forgot password',
    'auth.createAccount': 'Create account',
    'auth.newUser': 'New customer',
    'auth.registerTitle': 'Registration',
    'auth.firstName': 'First name',
    'auth.lastName': 'Last name',
    'auth.address': 'Address',
    'auth.addressPlaceholder': 'Start typing your address',
    'auth.addressSearching': 'Searching address...',
    'auth.userType': 'User type',
    'auth.registerButton': 'Create account',
    'auth.registerLoading': 'Creating...',
    'auth.alreadyAccount': 'I already have an account',
    'auth.emailPlaceholder': 'admin@gravity.app',
    'auth.registerEmailPlaceholder': 'customer@gravity.app',
    'auth.passwordPlaceholder': 'Your password',
    'role.CUSTOMER': 'Customer',
    'role.PARTNER': 'Partner',
    'role.RESTAURANT_OWNER': 'Restaurant owner',
    'role.COURIER': 'Courier',
    'role.ADMIN': 'Admin',
    'tabs.home': 'Home',
    'tabs.search': 'Search',
    'tabs.cart': 'Cart',
    'tabs.orders': 'Order',
    'tabs.restaurantOwner': 'Manage',
    'tabs.profile': 'Profile',
    'home.mainNavigation': 'Main navigation',
    'home.menu': 'Menu',
    'home.notifications': 'Notifications',
    'home.changeAddress': 'Change delivery address',
    'home.heroAlt': 'Gravity drone carrying an order',
    'home.search': 'Search',
    'home.searchPlaceholder': 'Search for a restaurant or dish',
    'home.filters': 'Filters',
    'home.categories': 'Categories',
    'home.all': 'View all',
    'home.popularRestaurants': 'Popular restaurants',
    'home.addRestaurant': 'Add',
    'home.emptyTitle': 'No restaurants',
    'home.emptyCopy': 'Try another category.',
    'home.offers': 'Current offers',
    'home.offerCta': 'View current offer',
    'home.offerTitle': '20% off your first order',
    'home.offerCode': 'Use code',
    'profile.userProfile': 'User profile',
    'profile.activeSession': 'Active session',
    'profile.title': 'Profile',
    'profile.copy': 'Gravity authentication is active through a front-end secure cookie.',
    'profile.cookieToken': 'Cookie token',
    'profile.logout': 'Log out',
    'placeholder.searchTitle': 'Search',
    'placeholder.ordersTitle': 'Orders',
  },
  ar: {
    'app.name': 'Gravity',
    'language.label': 'اللغة',
    'language.fr': 'الفرنسية',
    'language.en': 'الإنجليزية',
    'language.ar': 'العربية',
    'auth.secureAccess': 'دخول آمن',
    'auth.loginTitle': 'تسجيل الدخول',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.loginButton': 'تسجيل الدخول',
    'auth.loginLoading': 'جار تسجيل الدخول...',
    'auth.forgotPassword': 'نسيت كلمة المرور',
    'auth.createAccount': 'إنشاء حساب',
    'auth.newUser': 'عميل جديد',
    'auth.registerTitle': 'التسجيل',
    'auth.firstName': 'الاسم الأول',
    'auth.lastName': 'اسم العائلة',
    'auth.address': 'العنوان',
    'auth.addressPlaceholder': 'ابدأ بكتابة عنوانك',
    'auth.addressSearching': 'جار البحث عن العنوان...',
    'auth.userType': 'نوع المستخدم',
    'auth.registerButton': 'إنشاء حساب',
    'auth.registerLoading': 'جار الإنشاء...',
    'auth.alreadyAccount': 'لدي حساب بالفعل',
    'auth.emailPlaceholder': 'admin@gravity.app',
    'auth.registerEmailPlaceholder': 'customer@gravity.app',
    'auth.passwordPlaceholder': 'كلمة المرور',
    'role.CUSTOMER': 'عميل',
    'role.PARTNER': 'شريك',
    'role.RESTAURANT_OWNER': 'مالك مطعم',
    'role.COURIER': 'مندوب توصيل',
    'role.ADMIN': 'مدير',
    'tabs.home': 'الرئيسية',
    'tabs.search': 'البحث',
    'tabs.cart': 'السلة',
    'tabs.orders': 'الطلبات',
    'tabs.restaurantOwner': 'Management',
    'tabs.profile': 'الملف الشخصي',
    'home.mainNavigation': 'التنقل الرئيسي',
    'home.menu': 'القائمة',
    'home.notifications': 'الإشعارات',
    'home.changeAddress': 'تغيير عنوان التوصيل',
    'home.heroAlt': 'طائرة Gravity تنقل طلبا',
    'home.search': 'البحث',
    'home.searchPlaceholder': 'ابحث عن مطعم أو طبق',
    'home.filters': 'الفلاتر',
    'home.categories': 'التصنيفات',
    'home.all': 'عرض الكل',
    'home.popularRestaurants': 'مطاعم شائعة',
    'home.addRestaurant': 'إضافة',
    'home.emptyTitle': 'لا توجد مطاعم',
    'home.emptyCopy': 'جرب تصنيفا آخر.',
    'home.offers': 'العروض الحالية',
    'home.offerCta': 'عرض العرض الحالي',
    'home.offerTitle': 'خصم 20% على أول طلب',
    'home.offerCode': 'استخدم الرمز',
    'profile.userProfile': 'ملف المستخدم',
    'profile.activeSession': 'جلسة نشطة',
    'profile.title': 'الملف الشخصي',
    'profile.copy': 'مصادقة Gravity مفعلة عبر ملف تعريف ارتباط آمن في الواجهة.',
    'profile.cookieToken': 'رمز ملف الارتباط',
    'profile.logout': 'تسجيل الخروج',
    'placeholder.searchTitle': 'البحث',
    'placeholder.ordersTitle': 'الطلبات',
  },
};

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  readonly language = signal<AppLanguage>(this.readLanguage());

  constructor() {
    this.applyDocumentLanguage(this.language());
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
    this.writeCookie(language);
    this.applyDocumentLanguage(language);
  }

  t(key: TranslationKey): string {
    return translations[this.language()][key];
  }

  isRtl(): boolean {
    return this.language() === 'ar';
  }

  private readLanguage(): AppLanguage {
    if (typeof document === 'undefined') {
      return 'fr';
    }

    const cookie = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith('gravity_lang='));
    const value = cookie?.substring('gravity_lang='.length);

    return this.isAppLanguage(value) ? value : 'fr';
  }

  private writeCookie(language: AppLanguage): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie = `gravity_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = translations[language]['app.name'];
  }

  private isAppLanguage(value: string | undefined): value is AppLanguage {
    return value === 'fr' || value === 'en' || value === 'ar';
  }
}

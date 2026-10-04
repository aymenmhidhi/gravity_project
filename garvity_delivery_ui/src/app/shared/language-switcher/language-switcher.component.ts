import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppLanguage, TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-language-switcher',
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss'],
  imports: [FormsModule],
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(TranslationService);
  readonly languages: Array<{ value: AppLanguage; shortLabel: string; labelKey: 'language.fr' | 'language.en' | 'language.ar' }> = [
    { value: 'fr', shortLabel: 'FR', labelKey: 'language.fr' },
    { value: 'en', shortLabel: 'EN', labelKey: 'language.en' },
    { value: 'ar', shortLabel: 'AR', labelKey: 'language.ar' },
  ];

  updateLanguage(value: string): void {
    if (value === 'fr' || value === 'en' || value === 'ar') {
      this.i18n.setLanguage(value);
    }
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private activeLangSubject = new BehaviorSubject<string>('es'); // Idioma por defecto
  activeLang$ = this.activeLangSubject.asObservable();

  setActiveLang(lang: string) {
    this.activeLangSubject.next(lang);
  }
}

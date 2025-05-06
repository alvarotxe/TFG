// src/app/core/i18n/custom-paginator-intl.ts
import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@ngneat/transloco';

@Injectable()
export class CustomMatPaginatorIntl extends MatPaginatorIntl {
  constructor(private translocoService: TranslocoService) {
    super();
    this.translateLabels();
    // Actualizar las traducciones en tiempo real si cambias de idioma
    this.translocoService.langChanges$.subscribe(() => {
      this.translateLabels();
      this.changes.next();
    });
  }

  translateLabels() {
    this.itemsPerPageLabel = this.translocoService.translate('paginator.itemsPerPageLabel');
    this.nextPageLabel = this.translocoService.translate('paginator.nextPageLabel');
    this.previousPageLabel = this.translocoService.translate('paginator.previousPageLabel');
    this.firstPageLabel = this.translocoService.translate('paginator.firstPageLabel');
    this.lastPageLabel = this.translocoService.translate('paginator.lastPageLabel');
    this.getRangeLabel = (page: number, pageSize: number, length: number) => {
      if (length === 0 || pageSize === 0) {
        return `0 de ${length}`;
      }
      const startIndex = page * pageSize;
      const endIndex = startIndex < length
        ? Math.min(startIndex + pageSize, length)
        : startIndex + pageSize;
      return `${startIndex + 1} - ${endIndex} de ${length}`;
    };
  }
}
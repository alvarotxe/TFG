import { Component, Inject } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  template: `

<div mat-dialog-content class="mat-body">
  <mat-icon aria-hidden="false" aria-label="Warning" class="warning-icon">warning</mat-icon>
  <p class="message">{{ data.message }}</p>
</div>

<div mat-dialog-actions class="action-buttons">
  <button mat-raised-button color="warn" (click)="onClose('cancel')" class="cancel-btn">
    <mat-icon>cancel</mat-icon> {{ 'cancelar' | transloco }}
  </button>
  <button mat-raised-button color="primary" (click)="onClose('confirm')" class="confirm-btn">
    <mat-icon>check_circle</mat-icon> {{ 'confirmar' | transloco }}
  </button>
</div>
  `,
  imports      : [MatDialogModule,MatButtonModule,MatIconModule,TranslocoModule],
  standalone   : true,
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>, // Referencia al diálogo
    @Inject(MAT_DIALOG_DATA) public data: any // Datos que se pasan al diálogo
  ) {}

  // Cierra el diálogo con el resultado ('confirm' o 'cancel')
  onClose(result: string): void {
    this.dialogRef.close(result);
  }
}


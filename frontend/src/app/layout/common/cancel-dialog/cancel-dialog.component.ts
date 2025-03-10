import { Component,Inject } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
import { MatDialogRef,MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-cancel-dialog',
    templateUrl: './cancel-dialog.component.html',
    imports      : [MatDialogModule,MatButtonModule,MatIconModule,TranslocoModule],
    standalone   : true,
  })
  export class CancelDialogComponent {
    constructor(public dialogRef: MatDialogRef<CancelDialogComponent>) {}
  
    onClose(result: string): void {
      this.dialogRef.close(false);
    }
  
    onCancel(): void {
      this.dialogRef.close(true); // Cierra el diálogo y envía `false` como respuesta
    }
  }
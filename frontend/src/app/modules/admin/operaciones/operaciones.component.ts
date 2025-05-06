import { CdkScrollable } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, ViewChild, AfterViewInit ,ChangeDetectorRef  } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../layout/common/confirm-dialog/confirm-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { OperationsService } from '../../../services/operations.service';
import { SearchComponent } from 'app/layout/common/search/search.component';
import { CustomMatPaginatorIntl } from '../../../../assets/i18n/custom-paginator-intl';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Component({
    selector     : 'operaciones',
    standalone   : true,
    templateUrl  : './operaciones.component.html',
    styleUrls: ['./operaciones.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports      : [CdkScrollable, MatSidenavModule,TranslocoModule, ReactiveFormsModule,MatFormFieldModule,MatSnackBarModule,CommonModule,MatDialogModule,MatIconModule,MatPaginatorModule, RouterLink,MatTableModule, MatButtonModule,SearchComponent],
    providers: [
      { provide: MatPaginatorIntl, useClass: CustomMatPaginatorIntl } 
    ]
})
export class OperacionesComponent implements AfterViewInit
{
  operacionesData: any[] = [];
  dataSource: any = { data: [] };
  pageIndex: number = 0;
  pageSize: number = 10;
  totalPages: number = 1;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(SearchComponent) searchComponent: SearchComponent;
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef, 
    private operacionService: OperationsService,
    private translocoService: TranslocoService,
    private dialog: MatDialog, 
    private snackBar: MatSnackBar){}

  ngAfterViewInit() {
    this.updatePaginator();
  }

  ngOnInit(): void {
    this.loadProyectos();
  }

  loadProyectos(): void {
    this.operacionService.getOperations().subscribe((data: any[]) => {
        this.operacionesData = data;
        this.updateTableData();
    });
  }

  updateTableData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.operacionesData.slice(start, end);
    this.totalPages = Math.ceil(this.operacionesData.length / this.pageSize);
     // Forzamos la detección de cambios
    //this.cdr.detectChanges();
  }

  updatePaginator(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.operacionesData.slice(start, end);  // Actualiza los datos visibles en la tabla
    this.totalPages = Math.ceil(this.operacionesData.length / this.pageSize);
    // Forzamos la detección de cambios
    this.cdr.detectChanges();
  }
  
  onPaginatorPrev(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.updateTableData();
    }
  }

  onPaginatorNext(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.updateTableData();
    }
  }

  onSearch(query: string): void {
    if (query) {
      console.log(this.operacionesData);
      // Filtrar los proyectos según el nombre o la descripción
      const filteredProyectos = this.operacionesData.filter((proyecto) =>
        proyecto.operacion.toLowerCase().includes(query.toLowerCase()) ||
        proyecto.descripcion.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filteredProyectos.length > 0) {
        this.operacionesData = filteredProyectos;
        this.updateTableData();
      } else {
        const message = this.translocoService.translate('operation_not_found');
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        this.operacionesData = [];  // Vaciar la tabla si no hay resultados
        this.updateTableData();  // Actualizar la tabla (vacía)
      }
    } else {
      // Si no hay texto de búsqueda, recargamos todos los proyectos
      this.loadProyectos();  // Recargamos todos los proyectos
    }
  }  

  onSearchQuery(query: string): void {
    this.onSearch(query);  // Llamamos al método onSearch con el query recibido
  }

  onPaginatorChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateTableData();
  }

  onAnyadirProyecto(){
    this.router.navigate(['/datos-operacion'])
  }

  onEditar(element: any): void {
    this.router.navigate(['/datos-operacion'], { queryParams: { id: element.id } });
  }

  onEliminar(element: any): void {
    const message = this.translocoService.translate('confirmacion_eliminacion');
    const snackBarMessage = this.translocoService.translate('operacion_borrada_correctamente');
    const snackBarError = this.translocoService.translate('operacion_borrada_error');
    const snackBarClose = this.translocoService.translate('close');
  
    // Abrir el diálogo de confirmación con el mensaje traducido
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      height: '200px',
      data: { message: message }
    });
  
    dialogRef.afterClosed().pipe(
      tap((result) => {
        if (result === 'confirm') {
          this.operacionService.deleteOperacion(element.id).pipe(
            tap(() => {
              this.operacionesData = this.operacionesData.filter(proyecto => proyecto.id !== element.id);
              this.dataSource.data = this.operacionesData;
              this.snackBar.open(snackBarMessage, snackBarClose, {
                duration: 3000,
                panelClass: ['snack-bar-success'],
              });
              this.router.navigate(['/operaciones']);
            }),
            catchError((error) => {
              console.error('Error al eliminar la operación:', error);
              this.snackBar.open(snackBarError, snackBarClose, {
                duration: 3000,
                panelClass: ['snack-bar-error'],
              });
              return of(null); // Retornar un observable vacío para evitar que el flujo falle
            })
          ).subscribe();
        }
      })
    ).subscribe();
  }
}

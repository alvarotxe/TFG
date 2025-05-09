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
import { ProyectoService } from '../../../services/proyectos.service';
import { SearchComponent } from 'app/layout/common/search/search.component';
import { CustomMatPaginatorIntl } from '../../../../assets/i18n/custom-paginator-intl';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { timer,of } from 'rxjs';
import { switchMap ,catchError,map, tap } from 'rxjs/operators';

@Component({
    selector     : 'proyectos',
    standalone   : true,
    templateUrl  : './proyectos.component.html',
    styleUrls: ['./proyectos.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports      : [CdkScrollable, MatSidenavModule,TranslocoModule, ReactiveFormsModule,MatFormFieldModule,MatSnackBarModule,CommonModule,MatDialogModule,MatIconModule,MatPaginatorModule, RouterLink,MatTableModule, MatButtonModule,SearchComponent],
    providers: [
        { provide: MatPaginatorIntl, useClass: CustomMatPaginatorIntl } 
    ]
})
export class ProyectoComponent implements AfterViewInit
{
  proyectosData: any[] = [];
  displayedColumns: string[] = ['id','nombre', 'descripcion','lastModified','opciones'];
  dataSource: any = { data: [] };
  pageIndex: number = 0;
  pageSize: number = 10;
  totalPages: number = 1;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(SearchComponent) searchComponent: SearchComponent;
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef, 
    private proyectoService: ProyectoService,
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
    this.proyectoService.getProyectos().subscribe((data: any[]) => {
      this.proyectosData = data;
      this.updateTableData();
    });
  }

  updateTableData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.proyectosData.slice(start, end);
    this.totalPages = Math.ceil(this.proyectosData.length / this.pageSize);
    // Forzamos la detección de cambios
    this.cdr.detectChanges();
  }  

  updatePaginator(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.dataSource.data = this.proyectosData.slice(start, end);
    this.totalPages = Math.ceil(this.proyectosData.length / this.pageSize);
    // Forzamos la detección de cambios
    this.cdr.detectChanges();
  }
  
  onPaginatorPrev(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.updateTableData();
    }
  }

  onPaginatorChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateTableData();
  }
  

  onPaginatorNext(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.updateTableData();
    }
  }
  
  onSearch(query: string): void {
    if (query) {
      // Filtrar los proyectos según el nombre o la descripción
      const filteredProyectos = this.proyectosData.filter((proyecto) =>
        proyecto.nombre.toLowerCase().includes(query.toLowerCase()) ||
        proyecto.descripcion.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filteredProyectos.length > 0) {
        this.proyectosData = filteredProyectos;
        this.updateTableData();
      } else {
        const message = this.translocoService.translate('project_not_found');
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        this.proyectosData = [];  // Vaciar la tabla si no hay resultados
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

  onAnyadirProyecto(){
    this.router.navigate(['/datos-proyecto'])
  }

  onDuplicar(proyecto: any): void {
    this.proyectoService.duplicateProyecto(proyecto.id).pipe(
      tap(() => {
        this.snackBar.open('Proyecto duplicado correctamente', 'Cerrar', { duration: 3000 });
      }),
      // Esperar 2 segundos antes de recargar
      switchMap(() => timer(1000)), // 2000 milisegundos = 2 segundos
      tap(() => {
        this.loadProyectos(); // Recarga la lista desde el backend
      }),
      catchError((error) => {
        this.snackBar.open('No se ha podido duplicar el proyecto', 'Cerrar', { duration: 3000 });
        console.error('Error al duplicar el proyecto:', error);
        return of(null);
      })
    ).subscribe();
  }

  onEditar(element: any): void {
    this.router.navigate(['/datos-proyecto'], { queryParams: { id: element.id } });
  }

  onEliminar(element: any): void {
    // Traducir el mensaje que aparece en el diálogo de confirmación
    const message = this.translocoService.translate('confirmacion_eliminacion');
    const snackBarMessage = this.translocoService.translate('proyecto_borrado_correctamente');
    const snackBarError = this.translocoService.translate('proyecto_borrado_error');
    const snackBarClose = this.translocoService.translate('close');
  
    // Abrir el diálogo de confirmación con el mensaje traducido
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      height: '200px',
      data: { message: message }  // Pasar el mensaje traducido
    });
  
    dialogRef.afterClosed().pipe(
      tap((result) => {
        if (result === 'confirm') {
          this.proyectoService.deleteProyecto(element.id).pipe(
            tap(() => {
              this.proyectosData = this.proyectosData.filter(proyecto => proyecto.id !== element.id);
              this.dataSource.data = this.proyectosData;
              this.snackBar.open(snackBarMessage, snackBarClose, {
                duration: 3000,
                panelClass: ['snack-bar-success'],
              });
            }),
            catchError((error) => {
              console.error('Error al eliminar el proyecto:', error);
              this.snackBar.open(snackBarError, snackBarClose, {
                duration: 3000,
                panelClass: ['snack-bar-error'],
              });
              return of(null); // Retornar un observable vacío para que el flujo continúe
            })
          ).subscribe();
        }
      })
    ).subscribe();
  }
}

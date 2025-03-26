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
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

@Component({
    selector     : 'proyectos',
    standalone   : true,
    templateUrl  : './proyectos.component.html',
    styleUrls: ['./proyectos.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports      : [CdkScrollable, MatSidenavModule,TranslocoModule, ReactiveFormsModule,MatFormFieldModule,MatSnackBarModule,CommonModule,MatDialogModule,MatIconModule,MatPaginatorModule, RouterLink,MatTableModule, MatButtonModule,SearchComponent],
})
export class ProyectoComponent implements AfterViewInit
{
  proyectosData: any[] = [];
  filteredProyectosData: any[] = [];
  displayedColumns: string[] = ['id','nombre', 'descripcion','lastModified','opciones'];
  dataSource: any = { data: [] };
  pageIndex: number = 0;
  pageSize: number = 7;
  totalPages: number = 1;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(SearchComponent) searchComponent: SearchComponent;
  constructor(private router: Router,private cdr: ChangeDetectorRef, private proyectoService: ProyectoService,private translocoService: TranslocoService,private dialog: MatDialog, private snackBar: MatSnackBar){}

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
    this.dataSource.data = this.proyectosData.slice(start, end);  // Actualiza los datos visibles en la tabla
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

  onPaginatorNext(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.updateTableData();
    }
  }
  
  onSearch(query: string): void {
    if (query) {
      this.proyectoService.searchProyectos(query).subscribe(
        (resultSets: any[]) => {
          if (resultSets && resultSets.length > 0) {
            this.proyectosData = resultSets;
            this.updateTableData();
          } else {
            this.snackBar.open('No se encontraron proyectos', 'Cerrar', { duration: 3000 });
          }
        },
        (error) => {
          this.snackBar.open('Error al buscar proyectos', 'Cerrar', { duration: 3000 });
        }
      );
    } else {
      this.loadProyectos();
    }
  }
  // Método para escuchar el evento de búsqueda en el SearchComponent
  onSearchQuery(query: string): void {
    this.onSearch(query);  // Llamamos al método onSearch con el query recibido
  }

  onAnyadirProyecto(){
    this.router.navigate(['/datos-proyecto'])
  }

  onDuplicar(proyecto: any) {
    this.proyectoService.duplicateProyecto(proyecto.id).subscribe(
      (response) => {
        console.log('Proyecto duplicado:', response);
        // Aquí podrías agregar la lógica para actualizar la vista o hacer algo más después de duplicar el proyecto
      },
      (error) => {
        console.error('Error al duplicar el proyecto:', error);
      }
    );
  }  

  onEditar(element: any): void {
    this.router.navigate(['/datos-proyecto'], { queryParams: { id: element.id } });
  }

  onEliminar(element: any): void {
    // Traducir el mensaje que aparece en el diálogo de confirmación
    const message = this.translocoService.translate('confirmacion_eliminacion');
    // Abrir el diálogo de confirmación con el mensaje traducido
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      height: '200px',
      data: { message: message }  // Pasar el mensaje traducido
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.proyectoService.deleteProyecto(element.id).subscribe(
          () => {
            // Traducir el mensaje para el snackBar
            const snackBarMessage = this.translocoService.translate('proyecto_borrado_correctamente');
            const snackBarClose = this.translocoService.translate('close');
            this.proyectosData = this.proyectosData.filter(proyecto => proyecto.id !== element.id);
            this.dataSource.data = this.proyectosData;
            // Mostrar el mensaje en el snackBar con los textos traducidos
            this.snackBar.open(snackBarMessage, snackBarClose, {
              duration: 3000,
              panelClass: ['snack-bar-success'],
            });
          },
          (error) => {
            console.error('Error al eliminar el proyecto', error);
          }
        );
      }
    });
  }
}

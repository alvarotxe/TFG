import { Component,EventEmitter, Output, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ActivatedRoute,Router  } from '@angular/router';
import { OperationsService } from '../../../services/operations.service';
import { FormControl,FormBuilder, FormGroup } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { ProyectoService } from '../../../services/proyectos.service'
import { catchError, switchMap, tap } from 'rxjs/operators';
import { of, Observable} from 'rxjs';

interface Operation {
    name: string;
    active: boolean;
    config: string;
    selectedControl: FormControl;
    quantity: number;
    draggable?: boolean;
     // Propiedad adicional
  }

@Component({
  selector: 'app-select-dialog',
  templateUrl: './select-dialog.component.html',
  styleUrls: ['./select-dialog.component.css'],
  imports:[MatPaginator,ReactiveFormsModule,MatSnackBarModule,MatIconModule,MatMenuModule,MatButtonModule,MatDialogModule,TranslocoModule,MatCheckboxModule,MatTooltipModule,CommonModule,MatTableModule,MatInputModule,MatFormFieldModule],
  standalone   : true,
})
export class SelectDialogComponent {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() selectionChange = new EventEmitter<any[]>();

  confirmDialogOpen: boolean = false;
  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;
  aggregatedOperations:any;
  operationsList: any[];
  operationsList2: any[];
  selectedOperations: any[] = [];
  filteredOperations: MatTableDataSource<any>;
  descriptionVisible = false;
  pageSize = 4;
  projectId: number;
  archivo:any;
  selectedOperationsCount: number = 0;
  selectTotalOperaciones: number = 0;

  constructor(
    public dialogRef: MatDialogRef<SelectDialogComponent>,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private projectService:ProyectoService,
    private operationsService: OperationsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.filteredOperations = new MatTableDataSource(this.operationsList);
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(
      tap((params) => {
        this.proyectoId = params['id'] || null;
      }),
      switchMap(() => {
        // Obtener los datos del proyecto
        return this.projectService.getProyectoById(this.proyectoId).pipe(
          catchError((error) => {
            this.snackBar.open('Error al obtener los datos del proyecto', 'Cerrar', { duration: 3000 });
            return of(null); // Si hay un error, devuelve null
          })
        );
      }),
      switchMap((data) => {
        if (data) {
          this.proyectoDataID = data;
          this.projectId = this.proyectoDataID.id;
          this.archivo = this.proyectoDataID.archivo;
          // Obtener todas las operaciones disponibles
          return this.getOperationsFromTable(); // Ahora devuelve un observable
        }
        return of([]); // Si no hay datos del proyecto, devuelve un array vacío
      }),
      switchMap(() => {
        // Obtener las operaciones ya asociadas al proyecto
        return this.operationsService.getOperationsByProject(this.projectId).pipe(
          catchError((error) => {
            this.snackBar.open('Error al obtener las operaciones del proyecto', 'Cerrar', { duration: 3000 });
            return of([]); // Si hay un error, devuelve un array vacío
          })
        );
      })
    ).subscribe((operationsFromProject) => {
      if (operationsFromProject) {
        this.selectedOperations = operationsFromProject;
        this.updateOperationsList();
      }
    });
  }

  updateOperationsList() {
    // Aquí actualizas la lista de operaciones seleccionadas con los datos obtenidos
    const operationCounts = this.selectedOperations.reduce((acc: any, operation: any) => {
      if (!acc[operation.operacion]) {
        acc[operation.operacion] = { ...operation, count: 1 };
      } else {
        acc[operation.operacion].count += 1;
      }
      return acc;
    }, {});
  
    this.operationsList.forEach((operation: any) => {
      if (operationCounts[operation.operacion]) {
        operation.count = operationCounts[operation.operacion].count;
        operation.selectedControl.setValue(true);
      }
    });
  
    this.filteredOperations.data = this.operationsList;
    this.markSelectedOperations();
  }

  getOperationsFromTable(): Observable<any[]> {
    return this.operationsService.getOperations().pipe(
      tap((operationsData) => {
        this.selectTotalOperaciones = operationsData.length;
        // Si no hay operaciones disponibles, asignar la lista vacía
        if (operationsData.length === 0) {
          this.operationsList = [];
          this.filteredOperations.data = this.operationsList;
          return;
        }
        // Agrupar operaciones disponibles por nombre y contar las ocurrencias
        const operationCounts = operationsData.reduce((acc: any, operation: any) => {
          if (!acc[operation.operacion]) {
            acc[operation.operacion] = { ...operation, count: 0 };
          }
          return acc;
        }, {});
  
        // Crear una lista de operaciones disponibles con controles para selección
        this.operationsList = operationsData.map((op: any) => ({
          ...op,
          selectedControl: new FormControl(false),
          count: operationCounts[op.operacion]?.count || 0,
        }));
  
        // Asignar las operaciones al dataSource del filtro
        this.filteredOperations.data = this.operationsList;
  
        // Establecer el paginador después de que los datos se hayan cargado
        this.filteredOperations.paginator = this.paginator;
  
        // Forzar la detección de cambios en la vista
        this.cdr.detectChanges();
  
        // Esperar el siguiente ciclo de detección de cambios
        Promise.resolve().then(() => this.cdr.detectChanges());
      }),
      catchError((error) => {
        this.snackBar.open('Error al obtener las operaciones disponibles', 'Cerrar', { duration: 3000 });
        return of([]); // Si hay un error, devuelve un array vacío
      })
    );
  }
  
  selectAll(): void {
    this.operationsList.forEach(operation => {operation.selectedControl.setValue(true);operation.count += 1;});
    this.updateSelectedOperationsCount();
  }

  deselectAll(): void {
    // Iterar sobre la lista de operaciones
    this.operationsList.forEach(operation => {
      operation.selectedControl.setValue(false);
      operation.count = 0; // Asignamos 0 a la propiedad count de la operación
    });
    // Actualizar el contador de operaciones seleccionadas
    this.updateSelectedOperationsCount();
  }
  
  markSelectedOperations(): void {
    this.operationsList.forEach(operation => {
      const isSelected = this.selectedOperations.some(selectedOp => selectedOp.id === operation.id);
      operation.selectedControl.setValue(isSelected, { emitEvent: false });
    });
    this.updateSelectedOperationsCount();
  }

  updateSelectedOperationsCount(): void {
    this.selectedOperationsCount = this.operationsList.filter(
      (op) => op.selectedControl.value === true
    ).length;
  }

  aumentarOperation(operation: any) {
    if (operation.count >= 0) {
      operation.count += 1;
      operation.selectedControl.setValue(true);
      this.updateOperationInTable(operation);
    }
  }
  
  decrementQuantity(operation: any) {
    if (operation.count > 0) {
      operation.count -= 1;
      if(operation.count == 0){
        operation.selectedControl.setValue(false);
      }
      this.updateOperationInTable(operation);
    }
  }

  updateOperationInTable(operation: any) {
    // Aquí actualizas la operación en la lista de operaciones 
    const index = this.operationsList.findIndex(op => op.id === operation.id);
    if (index != -1) {
      this.operationsList[index] = { ...operation };
      this.filteredOperations.data = [...this.operationsList]; // Actualizamos el dataSource
      this.cdr.detectChanges(); // Forzamos la detección de cambios para que la tabla se actualice
    }
  }

  finalizeSelection(): void {
    const selectedOperations = this.operationsList.filter(op => op.selectedControl.value);
    const selectedOperationIds = selectedOperations.map(op => op.id);
    // Identificar las operaciones que han sido desmarcadas
    const operationsToRemove = this.selectedOperations.filter(op => !selectedOperationIds.includes(op.id)).map(op => op.id);
    // Guardar las operaciones seleccionadas
    this.operationsService.saveOperationsToProject(this.projectId, selectedOperations, this.archivo).subscribe(
      response => {
        this.snackBar.open('Operaciones guardadas con éxito', 'Cerrar', { duration: 3000 });
        this.selectionChange.emit(selectedOperations);
        this.dialogRef.close(selectedOperations);
         // Actualizar filteredOperations después de guardar
        this.selectedOperations = [...selectedOperations];
        this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

        this.cdr.detectChanges();
      },
      error => {
        this.snackBar.open('Error al guardar las operaciones', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(selectedOperations);
      }
    );
    // Eliminar las operaciones no seleccionadas
    if (operationsToRemove.length > 0) {
        this.operationsService.removeOperationsFromProject(this.projectId, operationsToRemove).subscribe(
          removeResponse => {
            this.snackBar.open('Operaciones eliminadas con éxito', 'Cerrar', { duration: 3000 });
            this.selectionChange.emit(selectedOperations);
            this.dialogRef.close(selectedOperations);

            this.selectedOperations = this.selectedOperations.filter(op => !operationsToRemove.includes(op.id));
            this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

            this.cdr.detectChanges();
          },
          error => {
            this.snackBar.open('Error al eliminar las operaciones', 'Cerrar', { duration: 3000 });
            this.dialogRef.close(selectedOperations);
          }
        );
      } else {
        this.dialogRef.close(selectedOperations);
      }
  }

  // Aplicar filtro de búsqueda
  applySearchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredOperations.filter = filterValue;
  }
}

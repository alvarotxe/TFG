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
    public dialogRef: MatDialogRef<SelectDialogComponent>,private router: Router,private snackBar: MatSnackBar,private route: ActivatedRoute,private projectService:ProyectoService,private operationsService: OperationsService,private fb: FormBuilder,private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.filteredOperations = new MatTableDataSource(this.operationsList);
    
  }

  ngOnInit(): void {
    // Obtener las operaciones ya asociadas a este proyecto
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
  
      // Obtener los datos del proyecto
      this.projectService.getProyectoById(this.proyectoId).subscribe((data) => {
        this.proyectoDataID = data;
        this.projectId = this.proyectoDataID.id;
        this.archivo = this.proyectoDataID.archivo;
  
        // Primero obtener todas las operaciones disponibles
        this.getOperationsFromTable(); // Llamada para obtener operaciones disponibles
  
        // Luego, obtener las operaciones ya asociadas al proyecto
        this.operationsService.getOperationsByProject(this.projectId).subscribe((operationsFromProject) => {
          this.selectedOperations = operationsFromProject;
  
          // Si hay operaciones asociadas, las agrupamos y contamos
          if (this.selectedOperations.length > 0) {
            const operationCounts = this.selectedOperations.reduce((acc: any, operation: any) => {
              if (!acc[operation.operacion]) {
                acc[operation.operacion] = { ...operation, count: 1 };
              } else {
                acc[operation.operacion].count += 1;
              }
              return acc;
            }, {});
  
            // Para cada operación de la lista, actualizamos el contador
            this.operationsList.forEach((operation: any) => {
              if (operationCounts[operation.operacion]) {
                operation.count = operationCounts[operation.operacion].count;
                operation.selectedControl.setValue(true);  // Marca la operación como seleccionada si está asociada
              }
            });
          }
  
          // Asignar las operaciones agrupadas al dataSource del filtro
          this.filteredOperations.data = this.operationsList;
  
          // Marcar las operaciones seleccionadas
          this.markSelectedOperations();
        });
      });
    });
  }
  
  
  // Obtener las operaciones disponibles de la tabla proyecto_operacion
  getOperationsFromTable(): void {
    this.operationsService.getOperations().subscribe((operationsData) => {
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
          acc[operation.operacion] = { ...operation, count: 0 };  // Iniciar en 0 si no hay operaciones asociadas
        }
        return acc;
      }, {});
  
      // Crear una lista de operaciones disponibles con controles para selección
      this.operationsList = operationsData.map((op: any) => ({
        ...op,
        selectedControl: new FormControl(false),
        count: operationCounts[op.operacion]?.count || 0,  // Usar el contador para cada operación
      }));
  
      // Asignar las operaciones al dataSource del filtro
      this.filteredOperations.data = this.operationsList;
  
      // Establecer el paginador después de que los datos se hayan cargado
      this.filteredOperations.paginator = this.paginator;
  
      // Forzar la detección de cambios en la vista
      this.cdr.detectChanges();
  
      // Esperar el siguiente ciclo de detección de cambios
      Promise.resolve().then(() => this.cdr.detectChanges());
    });
  }
  
  

  // Función para marcar todas las operaciones
  selectAll(): void {
    this.operationsList.forEach(operation => {operation.selectedControl.setValue(true);operation.count += 1;});
    this.updateSelectedOperationsCount();
  }

  // Función para desmarcar todas las operaciones
  deselectAll(): void {
    // Iterar sobre la lista de operaciones
    this.operationsList.forEach(operation => {
      // Desmarcar el control de selección
      operation.selectedControl.setValue(false);
  
      // Si count es solo un número, simplemente ponerlo a 0
      operation.count = 0;  // Asignamos 0 a la propiedad count de la operación
    });
  
    // Actualizar el contador de operaciones seleccionadas
    this.updateSelectedOperationsCount();
  }
  
  // Marcar las operaciones previamente seleccionadas
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
      operation.count += 1; // Incrementar la cantidad en 1 al duplicar
      operation.selectedControl.setValue(true);
      this.updateOperationInTable(operation);
    }
  }
  
  decrementQuantity(operation: any) {
    if (operation.count > 0) {
      operation.count -= 1; // Decrementar la cantidad en 1 al eliminar
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
   // Finalizar selección
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
        this.selectedOperations = [...selectedOperations]; // Actualizamos la lista de operaciones seleccionadas
        this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

        // Forzar detección de cambios
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

            // Actualizar filteredOperations después de eliminar
            this.selectedOperations = this.selectedOperations.filter(op => !operationsToRemove.includes(op.id)); // Actualizamos la lista de operaciones seleccionadas
            this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

            // Forzar detección de cambios
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

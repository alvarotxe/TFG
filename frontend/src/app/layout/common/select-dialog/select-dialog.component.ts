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
    draggable?: boolean;
     // Propiedad adicional
  }

@Component({
  selector: 'app-select-dialog',
  templateUrl: './select-dialog.component.html',
  styleUrls: ['./select-dialog.component.css'],
  imports:[MatPaginator,ReactiveFormsModule,MatIconModule,MatMenuModule,MatButtonModule,MatDialogModule,TranslocoModule,MatCheckboxModule,MatTooltipModule,CommonModule,MatTableModule,MatInputModule,MatFormFieldModule],
  standalone   : true,
})
export class SelectDialogComponent {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() selectionChange = new EventEmitter<any[]>();

  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;

  operationsList: any[];
  selectedOperations: any[] = [];
  filteredOperations: MatTableDataSource<any>;
  descriptionVisible = false;
  pageSize = 4;
  projectId: number;
  archivo:any;
  selectedOperationsCount: number = 0;
  selectTotalOperaciones: number = 0;

  constructor(
    public dialogRef: MatDialogRef<SelectDialogComponent>,private router: Router,private route: ActivatedRoute,private projectService:ProyectoService,private operationsService: OperationsService,private fb: FormBuilder,private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.filteredOperations = new MatTableDataSource(this.operationsList);
    
  }

  ngOnInit(): void {

    // Obtener las operaciones ya asociadas a este proyecto
    this.route.queryParams.subscribe((params) => {
        this.proyectoId = params['id'] || null;

        this.projectService.getProyectoById(this.proyectoId).subscribe((data) => {
          this.proyectoDataID = data;
          this.projectId = this.proyectoDataID.id;
          this.archivo = this.proyectoDataID.archivo;

          // Obtener las operaciones ya asociadas al proyecto
          this.operationsService.getOperationsByProject(this.projectId).subscribe((operationsFromProject) => {
            this.selectedOperations = operationsFromProject;
            this.markSelectedOperations();
          });

        });
      });

    // Obtener las operaciones disponibles
    this.operationsService.getOperations().subscribe((operationsData) => {
      this.selectTotalOperaciones = operationsData.length;
      if (operationsData) {
        this.operationsList = operationsData.map((op: any) => ({
          ...op,
          selectedControl: new FormControl(false),
        }));
        this.filteredOperations.data = this.operationsList;

        // Establecer el paginador después de que los datos se hayan cargado
        this.filteredOperations.paginator = this.paginator;
        
        // Forzar la detección de cambios
        this.cdr.detectChanges();
        // Espera al siguiente ciclo de detección de cambios
        Promise.resolve().then(() => this.cdr.detectChanges());
      }
    });

    //this.filteredOperations.paginator = this.paginator;
  }

  // Función para marcar todas las operaciones
  selectAll(): void {
    this.operationsList.forEach(operation => operation.selectedControl.setValue(true));
    this.updateSelectedOperationsCount();
  }

  // Función para desmarcar todas las operaciones
  deselectAll(): void {
    this.operationsList.forEach(operation => operation.selectedControl.setValue(false));
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

  // Finalizar selección
  finalizeSelection(): void {
    const selectedOperations = this.operationsList.filter(op => op.selectedControl.value);
    const selectedOperationIds = selectedOperations.map(op => op.id);
    

    // Identificar las operaciones que han sido desmarcadas
    const operationsToRemove = this.selectedOperations.filter(op => !selectedOperationIds.includes(op.id)).map(op => op.id);
    console.log(selectedOperations);
    // Guardar las operaciones seleccionadas
    this.operationsService.saveOperationsToProject(this.projectId, selectedOperations, this.archivo).subscribe(
      response => {
        console.log('Operaciones guardadas con éxito', response);
        this.selectionChange.emit(selectedOperations);
        this.dialogRef.close(selectedOperations);

         // Actualizar filteredOperations después de guardar
        this.selectedOperations = [...selectedOperations]; // Actualizamos la lista de operaciones seleccionadas
        this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

        // Forzar detección de cambios
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error al guardar las operaciones', error);
        this.dialogRef.close(selectedOperations);
      }
    );
    // Eliminar las operaciones no seleccionadas
    if (operationsToRemove.length > 0) {
        this.operationsService.removeOperationsFromProject(this.projectId, operationsToRemove).subscribe(
          removeResponse => {
            console.log('Operaciones eliminadas con éxito', removeResponse);
            this.selectionChange.emit(selectedOperations);
            this.dialogRef.close(selectedOperations);

            // Actualizar filteredOperations después de eliminar
            this.selectedOperations = this.selectedOperations.filter(op => !operationsToRemove.includes(op.id)); // Actualizamos la lista de operaciones seleccionadas
            this.filteredOperations.data = this.selectedOperations; // Asignamos los datos actualizados al dataSource de la tabla

            // Forzar detección de cambios
            this.cdr.detectChanges();
          },
          error => {
            console.error('Error al eliminar las operaciones', error);
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

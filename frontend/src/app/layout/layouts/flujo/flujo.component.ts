import { Component,HostBinding , ViewChild, ChangeDetectorRef,NgZone  } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { v4 as uuidv4 } from 'uuid';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort'; 
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTable } from '@angular/material/table';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OperationsService } from '../../../services/operations.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { ProyectoService } from '../../../services/proyectos.service'
import { ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Observable, from } from 'rxjs';
import { SelectDialogComponent } from '../../common/select-dialog/select-dialog.component'; // Importa el componente de diálogo
import { switchMap, catchError, map, tap, concatMap  } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ConfigDialogComponent } from '../../common/config-modal/config-dialog.component';

interface Operation {
  active: number;
  name: string;
  entrada:any;
  salida: any;
  confi: string;
  step:boolean;
  selectedControl: FormControl;
  draggable?: boolean;
  entradas:number;
  salidas:number;
  isActiveColumnVisible: boolean,
  isStepColumnVisible: boolean,
  isConfigColumnVisible: boolean,
  isMainRow?: boolean;
  isExpanded?: boolean;
  salidaValue?: string[];
  entradaValue?: string[];
  ent?: string[];
  availableFiles?: string[];
  archivo:string[];
  tempId?: any;
}

@Component({
  selector: 'app-flujo',
  standalone: true,
  imports:[MatSnackBarModule,MatButtonModule,MatSelectModule,MatCheckboxModule,FormsModule,DragDropModule,TranslocoModule,CommonModule,MatTableModule,MatPaginatorModule,MatSortModule,MatIconModule,MatTabsModule,MatDialogModule,MatFormFieldModule,MatInputModule,ReactiveFormsModule,MatDatepickerModule,MatSlideToggleModule],
  templateUrl: './flujo.component.html',
  styleUrls: ['./flujo.component.css'],
})
export class FlujoComponent{
  @HostBinding('style.--mat-select-width') selectWidth = '20px';
  @HostBinding('style.--mat-select-padding') selectPadding = '5px';
  @ViewChild(MatTable, { static: false }) table!: MatTable<any>;
  @ViewChild('paginator') paginator: MatPaginator;
  private availableFilesCache: Map<string, string[]> = new Map();

  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;

  isExpanded: boolean = false;
  isExpandedRight: boolean = false;
  operationsList: Operation[] = [];

  projectFile: string[] = [];
  availableFilesEntrada: string[] = [];
  filteredOperations = new MatTableDataSource<any>(this.operationsList);
  addedOperations: any[] = [];
  activeOperations: any[] = [];
  archivo: string[] = [];
  showOperationsSelector = false;
  mostrarFilasAdicionales = true;
  isMoveOrderMode = false;
  isOrderChanged = false;
  selectedOperations: any[] = [];
  logs: string = '';
  results: any[] = [];
  id:any;
  tempId: number;
  isModified: false;
  activarTodo: boolean = false;
  infoOperaciones:any;
  
  constructor(
    private matIconRegistry: MatIconRegistry, 
    private http: HttpClient, 
    private domSanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private snackBar: MatSnackBar,
    private projectService:ProyectoService,
    private operationsService: OperationsService) 
  {
      this.matIconRegistry.addSvgIcon(
        'eraser',
        this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/eraser.svg')
      );
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
      if (this.proyectoId) {
        this.projectService.getProyectoById(this.proyectoId).subscribe((data) => {
          this.proyectoDataID = data;
          this.archivo = [this.proyectoDataID.archivo];
          this.id = this.proyectoId;
          this.loadAddedOperations();
        });
      }
    });
  }

  // Método para cargar las operaciones asociadas a un proyecto
  loadAddedOperations(): void {
    forkJoin({
      projectOperations: this.operationsService.getOperationsByProjects(this.id).pipe(
        catchError((error) => {
          console.error('Error al obtener operaciones del proyecto:', error);
          this.snackBar.open('Error al cargar operaciones del proyecto', 'Cerrar', { duration: 3000 });
          return of([]); // Devuelve una lista vacía en caso de error
        })
      ),
      allOperations: this.operationsService.getOperationsByProject(this.id).pipe(
        catchError((error) => {
          console.error('Error al obtener todas las operaciones:', error);
          this.snackBar.open('Error al cargar la lista de operaciones', 'Cerrar', { duration: 3000 });
          return of([]); // Devuelve una lista vacía en caso de error
        })
      )
    }).subscribe(
      ({ projectOperations, allOperations }) => {
        let operationCounters: { [key: string]: number } = {};
        this.addedOperations = projectOperations.map((projOp: any) => {
          const archivosDelProyecto = this.proyectoDataID.archivo.split(',');
          this.projectFile = archivosDelProyecto;
          const matchingOperation = allOperations.find((op: any) => op.id === projOp.id_operacion);
          let salidaValues = [];
          let ent2 = [];
  
          if (matchingOperation && matchingOperation.salidas > 0) {
            ent2 = new Array(matchingOperation.entradas).fill('').map((_, i) => {
              return `${matchingOperation.operacion}_${'s' + (i + 1)}`;
            });
          }
  
          // Obtener un identificador único para esta operación específica
          if (matchingOperation && matchingOperation.salidas > 0) {
            const baseName = matchingOperation.operacion.replace(/\s+/g, '_');
            if (!operationCounters[baseName]) {
              operationCounters[baseName] = 1; // Primera aparición
            } else {
              operationCounters[baseName]++; // Aumentamos el contador
            }
            const operationIndex = operationCounters[baseName];
  
            salidaValues = new Array(matchingOperation.salidas).fill('').map((_, i) => {
              return `${operationIndex}_${baseName}_${'s' + (i + 1)}`;
            });
          }
  
          // Obtener valores de entrada desde la base de datos
          let entradaValuesFromDB = projOp.entrada ? JSON.parse(projOp.entrada) : [];
  
          return {
            id: projOp.id,
            id_operacion: projOp.id_operacion,
            name: matchingOperation ? matchingOperation.operacion : 'Desconocido',
            entrada: new Array(matchingOperation?.entradas || 0).fill(''),
            entradaValue: entradaValuesFromDB || new Array(matchingOperation?.entradas || 0).fill(''),
            salida: new Array(matchingOperation?.salidas || 0).fill(''),
            salidaValue: salidaValues,
            ent: ent2,
            active: projOp.activa,
            orden: projOp.orden,
            isActiveColumnVisible: true,
            isStepColumnVisible: true,
            isConfigColumnVisible: true,
            script: matchingOperation ? matchingOperation.script_text : 'Desconocido',
            selectedControl: new FormControl(false),
            entradas: matchingOperation ? matchingOperation.entradas : 0,
            salidas: matchingOperation ? matchingOperation.salidas : 0,
            archivo: this.archivo,
            tempId: uuidv4(),
            isModified: this.isModified,
            confi: projOp.confi || ''
          };
        });
  
        this.filteredOperations.data = [...this.addedOperations];
        const expandedOperations = this.expandedOperations();
        this.filteredOperations.data = expandedOperations;
  
        if (this.paginator) {
          this.filteredOperations.paginator = this.paginator;
        }
  
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error durante la carga de operaciones:', error);
        this.snackBar.open('No hay operaciones seleccionadas', 'Cerrar', { duration: 3000 });
      }
    );
  }
  

  expandedOperations($event?: any): Operation[] {
    let expandedList: Operation[] = [];

    this.addedOperations.forEach((operation) => {
        this.availableFilesEntrada = this.getAvailableFilesForOperation(operation);
        let allEntradaValues: any[] = operation.entradaValue ? [...operation.entradaValue] : [];

        const mainRow = {
            ...operation,
            isMainRow: true,
            entrada: operation.entrada.length > 0 ? operation.entrada : null,
            salida: operation.salida.length > 0 ? operation.salida : null,
            salidaValue: operation.salidaValue,
            entradaValue: operation.entradaValue.length > 0 ? [operation.entradaValue[0]] : [],
            ent: operation.ent,
            isExpanded: operation.isExpanded || false,
            availableFiles: this.availableFilesEntrada,
            allEntradaValues: allEntradaValues,
            additionalRows: [],
            tempId: operation.tempId,
        };

        expandedList.push(mainRow);

        // Filas adicionales
        for (let i = 1; i < operation.entrada.length || i < operation.salida.length; i++) {

            const extraRow = {
                id: operation.id,
                id_operacion: operation.id_operacion,
                name: operation.name,
                entrada: operation.entrada.length > 1 ? [operation.entrada[i]] : null,
                salida: operation.salida.length > 1 ? [operation.salida[i]] : null,
                salidaValue: operation.salidaValue && operation.salidaValue[i] ? [operation.salidaValue[i]] : [],
                entradaValue: operation.entradaValue && operation.entradaValue[i] ? [operation.entradaValue[i]] : [],
                ent:operation.ent && operation.ent[i] ? [operation.ent[i]] : [],
                confi: operation.confi,
                step: false,
                isMainRow: false,
                active: operation.active,
                entradas: operation.entrada,
                isActiveColumnVisible: false,
                isStepColumnVisible: false,
                isConfigColumnVisible: false,
                salidas: operation.salida,
                selectedControl: new FormControl(false),
                availableFiles: this.availableFilesEntrada,
                archivo: this.proyectoDataID.archivo || null,
                parentOperation: mainRow,
                tempId: operation.tempId,
                isModified: this.isModified
                
            };
            mainRow.additionalRows.push(extraRow);
            expandedList.push(extraRow);
        }
    });

    this.addedOperations = expandedList;
    return expandedList;
  }

  getAvailableFilesForOperation(operation: any): string[] {
    if (this.availableFilesCache.has(operation.orden)) {
      return this.availableFilesCache.get(operation.orden)!;
    }
    if (operation.orden === 1) {
      this.availableFilesEntrada = [...this.projectFile];
    } else {
      // Para operaciones posteriores, incluir las salidas de las operaciones anteriores
      this.availableFilesEntrada = [...this.projectFile];
      this.addedOperations.forEach((prevOp) => {
        // Añadir las salidas de operaciones previas (excluyendo la misma operación)
        if (prevOp.orden < operation.orden && prevOp.id !== operation.id) {
          this.availableFilesEntrada = [...this.availableFilesEntrada, ...prevOp.salidaValue];
        }
      });
    }
    this.availableFilesEntrada = Array.from(
      new Set(
        this.availableFilesEntrada
          .filter(file => typeof file === 'string' && file.trim() !== '')
      )
    );    
    // Cachear el resultado para esta operación
    this.availableFilesCache.set(operation.orden, this.availableFilesEntrada);
    return this.availableFilesEntrada;
  }

  saveOperations(): void {
    if (this.addedOperations.length === 0) {
      this.snackBar.open('No hay operaciones para guardar', 'Cerrar', { duration: 3000 });
      return;
    }
    const operationsToSave = this.addedOperations.filter(operation => operation.isModified && operation.isMainRow);
    const allOperationsToSave = operationsToSave.map(operation => {
      
      // Guardar la fila principal
      const mainOperation = {
        id: operation.id,
        id_proyecto: this.proyectoId,
        id_operacion: operation.id_operacion ?? null,
        entradaValue: operation.entradaValue ?? [],
        salidaValue: operation.salidaValue ?? [],
        confi: operation.confi ?? '',
        active: operation.active ?? 0,
        orden: operation.orden ?? null,
        name: operation.name,
        isMainRow: operation.isMainRow,
        tempId: operation.tempId
      };
      // Guardar las filas adicionales
      const additionalRows = operation.additionalRows ? operation.additionalRows.map(extraRow => ({
        id: operation.id,
        id_proyecto: this.proyectoId,
        id_operacion: extraRow.id_operacion ?? null,
        entradaValue: extraRow.entradaValue ?? [],
        salidaValue: extraRow.salidaValue ?? [],
        orden: extraRow.orden ?? null,
        name: operation.name,
        tempId: operation.tempId
      })) : [];
      return [mainOperation, ...additionalRows]; // Retornar tanto la fila principal como las adicionales
    }).flat(); // Aplanar el array de operaciones
    
    if (allOperationsToSave.length === 0) {
      this.snackBar.open('Para guardar debes seleccionar todas las entradas de dicha operación', 'Cerrar', { duration: 3000 });
      return; // Salir si no hay operaciones
    }
    // Guardar todas las operaciones
    this.operationsService.saveOperations(allOperationsToSave).subscribe({
      next: (response) => {
        this.snackBar.open('Operaciones guardadas correctamente', 'Cerrar', { duration: 3000 });
        this.loadAddedOperations(); // Recargar operaciones después de guardar
      },
      error: (error) => {
        this.snackBar.open('Error al guardar las operaciones', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openConfigModal(operation: any) {
    operation.isModified = true;
    const dialogRef = this.dialog.open(ConfigDialogComponent, {
      width: '800px',
      data: { config: operation.confi || '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== null) {
        operation.confi = result; // Guarda el nuevo valor
      }
    });
  }

  // Método para alternar la visibilidad de las filas adicionales
  toggleAdditionalRowsVisibility(show: boolean): void {
    this.addedOperations.forEach(operation => {
      if (!operation.isMainRow) {
        operation.isHidden = !show;
      }
    });
  }

  onEye(): void {
    this.mostrarFilasAdicionales = !this.mostrarFilasAdicionales; // Alterna entre activar y desactivar el modo detalle
    this.toggleAdditionalRowsVisibility(this.mostrarFilasAdicionales);
  }

  onActivar(): void {
    this.mostrarFilasAdicionales = !this.mostrarFilasAdicionales;
    this.toggleAdditionalRowsVisibility(this.mostrarFilasAdicionales);
  
    this.activarTodo = !this.activarTodo; // <<--- aquí alternamos activación/desactivación
  
    const activar = this.addedOperations.some(op => op.isMainRow && op.active === 0);
  
    this.addedOperations.forEach(operation => {
      if (operation.isMainRow) {
        operation.active = activar ? 1 : 0;
        operation.isModified = true;
      }
    });
  
    this.refreshTable();
  }  
  
  
  onMoveOrder(): void {
    // Alterna entre activar y desactivar el modo mover
    this.isMoveOrderMode = !this.isMoveOrderMode;
  
    // Siempre que se active el modo mover, ocultar las filas adicionales
    if (this.isMoveOrderMode) {
      this.mostrarFilasAdicionales = false;  // Se desactivan las filas adicionales
      this.toggleAdditionalRowsVisibility(this.mostrarFilasAdicionales);
    }
  
    // Si el modo mover es desactivado, no es necesario hacer nada
    this.isOrderChanged = true;
  }
  

  confirmOrder(): void {
    if (this.isOrderChanged) {
      // Llamar a la función que actualiza el orden en el backend
      this.updateOperationOrder();
      // Recargar la vista después de confirmar
      this.refreshTable();
      // Resetear el estado después de confirmar
      this.isOrderChanged = false;
      this.isMoveOrderMode = false;
      this.activarTodo = false;
      
    }
  }

  moveOperation(operation: any, direction: 'up' | 'down'): void {
    const validOperations = this.addedOperations.filter(operation => operation.isMainRow);
    const index = validOperations.indexOf(operation);
    if (index === -1) return;
  
    // Encontramos la operación principal
    const mainOperation = this.findMainOperation(index);
    if (!mainOperation) return;
  
    // Obtenemos todas sus filas adicionales
    const operationGroup = this.getOperationGroup(mainOperation);
  
    // Eliminamos el grupo de la lista
    this.removeOperationGroup(mainOperation);
  
    // Calculamos el nuevo índice
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.addedOperations.length) return; // Validar límites
  
    // Insertamos el grupo en el nuevo índice
    this.insertOperationGroup(newIndex, operationGroup);
  
    // Reasignamos el orden
    this.reassignOrder();
    this.updateAvailableFiles();
  
  }

  // Verificar si la operación es la primera
  isFirst(operation: any): boolean {
    return this.addedOperations.indexOf(operation) === 0;
  }

  // Verificar si la operación es la última
  isLast(operation: any): boolean {
    return this.addedOperations.indexOf(operation) === this.addedOperations.length - 1;
  }

  resetSelection(): void {
    this.selectedOperations = [];
  }

  onFileSelected(event: any, operation: any, index: number) {
    const selectedFile = event.value;
    // Asegurar que entradaValue exista
    if (!operation.entradaValue) {
      operation.entradaValue = [];
    }
    // Guardar el valor en la posición correspondiente
    operation.entradaValue[index] = selectedFile;
  
    // Si la operación tiene filas adicionales, actualizarlas también
    this.addedOperations.forEach((op) => {
      if (op.name === operation.name && op.id === operation.id) {
        op.entradaValue[index] = selectedFile;
      }
    });
    operation.entradaValue = operation.entradaValue.slice(0, operation.entradas);
    // Filtrar valores vacíos o undefined para evitar elementos vacíos en el array
    operation.entradaValue = operation.entradaValue.filter(value => value && value.trim() !== '');
    operation.isModified = true;
  }

  updateAvailableFiles(): void {
    // Limpiamos la caché de archivos disponibles
    this.availableFilesCache.clear();
    // Recalculamos los archivos disponibles para cada operación en su nuevo orden
    this.addedOperations.forEach(op => {
        op.availableFiles = this.getAvailableFilesForOperation(op);
    });
  }

  removeCircularReferences(obj: any): any {
    const seen = new Set();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined; // Omite la propiedad circular
        }
        seen.add(value);
      }
      return value;
    }));
  }

  updateOperationOrder(): void {
    const validOperations = this.addedOperations.filter(op => op.isMainRow);
    // Usamos la función removeCircularReferences antes de actualizar el orden
    const sanitizedOperations = validOperations.map((operation, index) => {
      this.updateDataSource();
      const cleanedOperation = this.removeCircularReferences(operation); // Limpiamos la operación de referencias circulares
      return {
        ...cleanedOperation,
        orden: index + 1,
        positionIndex: index
      };
    });

    this.operationsService.updateOperationsOrder(this.id, sanitizedOperations).subscribe({
      next: (response) => {
        this.snackBar.open('Orden de operaciones actualizado', 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open('Error al actualizar el orden', 'Cerrar', { duration: 3000 });
      }
    });
  }

  updateDataSource(): void {
    this.filteredOperations.data = [...this.addedOperations];
    if (this.paginator) {
      this.filteredOperations.paginator = this.paginator;
    }
    this.cdr.detectChanges();
  }
  
  refreshTable(): void {
    this.filteredOperations.data = [...this.addedOperations];
    this.table.renderRows();
  }

  reassignOrder(): void {
    let order = 1;
    const mainOperations = this.addedOperations.filter(op => op.isMainRow && op.id_operacion);
    for (const operation of mainOperations) {
      if (operation.isMainRow) {
        operation.orden = order;
        order++;
      }
    }
  }
  
  findMainOperation(index: number): Operation | null {
    const validOperations = this.addedOperations.filter(op => op.isMainRow);
    return validOperations.find((op, i) => i === index && op.isMainRow) || null;
  }

  getOperationGroup(operation: Operation): Operation[] {
    const validOperations = this.addedOperations.filter(op => op.isMainRow);
    // Buscamos la posición real de la operación en la lista
    const index = validOperations.indexOf(operation);
    if (index === -1) return [];
  
    // Buscamos todas las filas relacionadas, sin eliminar otras del mismo nombre
    const group = [operation];
    for (let i = index + 1; i < this.addedOperations.length; i++) {
      if (this.addedOperations[i].name === operation.name && !this.addedOperations[i].isMainRow) {
        group.push(this.addedOperations[i]);
      } else {
        break;
      }
    }
    return group;
  }
  
  removeOperationGroup(operation: Operation): void {
    const validOperations = this.addedOperations.filter(op => op.isMainRow);
    this.addedOperations = validOperations.filter(op => op.tempId !== operation.tempId);
  }  
  
  getNewIndex(index: number): number {
    let count = 0;
    for (let i = 0; i < this.addedOperations.length; i++) {
      if (this.addedOperations[i].isMainRow) {
        if (count === index) return i;
        count++;
      }
    }
    return this.addedOperations.length;
  }

  insertOperationGroup(index: number, group: Operation[]): void {
    this.addedOperations.splice(index, 0, ...group);
  }
    
  onOperationsUpdated(updatedOperations: any[]): void {
    this.addedOperations = updatedOperations;
  } 
    
  executeOperation(operation: any): Observable<any> {
    let inputFilePath: any;
    // Verifica cuántas entradas hay
    if (operation.entrada && operation.entrada.length > 0) {
        // Filtrar valores vacíos y eliminar duplicados
        inputFilePath = operation.allEntradaValues 
            ? [...new Set(operation.allEntradaValues.filter(file => file && file.trim() !== ''))] 
            : [];
    } else {
        inputFilePath = null;
    }
    
    const outputFilePath = operation.salidaValue;
    const additionalText = operation.confi;
    const rute_script = operation.script;
    return this.operationsService.runOperation(rute_script, inputFilePath, outputFilePath, additionalText, this.id, this.proyectoDataID.nombre)
      .pipe(
        tap(response => {
          this.results.push({
            operationName: operation.name,
            logs: response.logs,
            output: response.output,
            outputType: response.outputType
          });
          this.snackBar.open('Operación completada con éxito', 'Cerrar', { duration: 3000 });
        }),
        catchError(error => {
          this.results.push({
            operationName: operation.name,
            logs: error.error.logs || 'Hubo un error al ejecutar la operación',
            output: null,
            outputType: 'error'
          });
          this.snackBar.open('Error al ejecutar la operación', 'Cerrar', { duration: 3000 });
          return of(null);
        })
      );
  }

  // Método para ejecutar las operaciones de manera secuencial
  executeOperationsSequentially(): void {
    // Filtrar solo las operaciones activadas
    const activeOperations = this.addedOperations.filter((operation) => operation.active === 1);
    if (activeOperations.length === 0) {
      this.snackBar.open('Selecciona alguna operación antes de la ejecución', 'Cerrar', { duration: 3000 });
      return;
    }
    // Ordenar las operaciones activadas por el campo 'orden'
    const sortedOperations = activeOperations.sort((a, b) => a.orden - b.orden);
    // Usamos concatMap para que las operaciones se ejecuten de manera secuencial
    from(sortedOperations).pipe(
      concatMap((operation) => this.executeOperation(operation))
    ).subscribe({
      next: () => {
        this.snackBar.open('Operacion completada', 'Cerrar', { duration: 1000 });
      },
      complete: () => {
        this.snackBar.open('Todas las operaciones se han completado', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open('Hubo un error al ejecutar las operaciones', 'Cerrar', { duration: 3000 });
      }
    });
  }

  onSingleExecute(operation: any) {
    this.executeOperation(operation).subscribe({
      next: (response) => {
        this.snackBar.open(`Se ha completado la operación ${operation.name}`, 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(`No se ha podido completar la oepración ${operation.name}`, 'Cerrar', { duration: 3000 });
      }
    });
  }

  toggleExpandLeft(): void {
    this.isExpanded = !this.isExpanded;
    this.isExpandedRight = false;
  }

  toggleExpandRight(): void {
    this.isExpandedRight = !this.isExpandedRight;
    this.isExpanded = false;
  }

  // Aplicar filtro de búsqueda
  applySearchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.ngZone.run(() => {
      this.filteredOperations.filter = filterValue;
    });
  }

  // Modal para el Selector de Operaciones
  openOperationsSelector(): void {
    this.dialog.open(SelectDialogComponent, {
      width: '80%',
      data: {
        operations: this.operationsList,
        paginator: this.paginator,
      },
    }).afterClosed().subscribe((selectedOperations) => {
      if (selectedOperations) {
        this.addedOperations = selectedOperations;
        this.filteredOperations.data = this.addedOperations;
        this.infoOperaciones = this.filteredOperations.data;
        this.loadAddedOperations();
      }
    });
  }
  
  clearResults(): void {
    this.results = [];
    this.snackBar.open('Resultados limpiados', 'Cerrar', { duration: 3000 });
  }

  selectAll(): void {
    this.operationsList.forEach((operation) => {
      operation.selectedControl.setValue(true);
    });
  }
  
  deselectAll(): void {
    this.operationsList.forEach((operation) => {
      operation.selectedControl.setValue(false);
    });
  }

  //Activar o Desactivar Operación
  activateOperation(operation: any): void {
    operation.isModified = true;
    // Cambiar el valor de `active` entre 0 y 1 (true o false)
    operation.active = operation.active === 0 ? 1 : 0;
    // Filtrar las operaciones activas
    this.activeOperations = this.addedOperations.filter((op) => op.active === 1);
  }

  // Método para borrar todos los valores de la columna confi
  clearConfig(): void {
    // Itera sobre las operaciones y limpia el campo confi
    this.addedOperations.forEach(operation => {
      operation.confi = '';
    });
  }

  // Método para borrar solo el valor de la configuración en una fila específica
  clearConfigForRow(operation: Operation): void {
    operation.confi = '';
  }

  // Recargar resultados
  reloadResults(): void {
    //console.log('Resultados recargados:', this.addedOperations);
  }

  // Método para finalizar la selección
  finalizeSelection(): void {
    this.addedOperations = this.operationsList.filter(
      (op) => op.selectedControl.value
    );
    this.showOperationsSelector = false;
  }

  // Verificar si el archivo de salida existe
  fileExists(fileName: string): boolean {
    // Aquí se asume que 'salidaValue' contiene los archivos generados. Este es un ejemplo simple
    return this.addedOperations.some(operation =>
      operation.salidaValue?.includes(fileName) && fileName.trim() !== '');
  }

  // Método para manejar la descarga
  downloadOutputFile(fileName: string, name: string, id: number): void {
    const fileUrl = `http://localhost:3000/proyectos/download/${fileName}.csv/${name}/${id}`;
  
    // Hacer una solicitud HEAD para comprobar si el archivo existe en el servidor
    this.http.head(fileUrl).subscribe({
      next: () => {
        // Si la solicitud tiene éxito, el archivo existe, podemos proceder con la descarga
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName + '.csv';
        link.click();
      },
      error: (error) => {
        // Si la solicitud falla, significa que el archivo no existe
        if (error.status === 404) {
          this.snackBar.open(`No existe el archivo "${fileName}" en el servidor.`, 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open('Error al intentar descargar el archivo', 'Cerrar', { duration: 3000 });
        }
      }
    });
  } 
  
  // Procesar los resultados de salidas de las operaciones
  processResults(results: any[]): void {
    results.forEach((result) => {
      // Suponemos que el 'output' ya está como un array de salidas
      if (Array.isArray(result.output)) {
        // Asegurarnos de que hay múltiples salidas
        result.salidas = result.output.map((_, index) => `Salida ${index + 1}`);
      }
    });
  }
}






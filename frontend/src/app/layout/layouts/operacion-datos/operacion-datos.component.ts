import { Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort'; 
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { CancelDialogComponent } from '../../common/cancel-dialog/cancel-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ProyectoService } from '../../../services/proyectos.service'
import { OperationsService } from '../../../services/operations.service'
import { MatSelectModule } from '@angular/material/select';
import { FormGroup,FormControl, FormBuilder, Validators } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-operacion-datos',
  standalone: true,
  imports: [MatIconModule,MatDialogModule,MatSelectModule,TranslocoModule,MatDatepickerModule,MatSlideToggleModule,FormsModule,MatSortModule,MatPaginatorModule,MatTableModule,MatSnackBarModule,CommonModule,ReactiveFormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatTabsModule],
  templateUrl: './operacion-datos.component.html',
})
export class OperacionDatosComponent {
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('fileInput') fileInput: ElementRef;

  proyectoForm: FormGroup;
  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;

  originalProyectoData: any = null;
  activeTab: string = 'datos-operacion';
  fileName: string = '';
  configuracion: string;
  isEditMode: boolean = false; 
  modificar: string = '';
  selectedFiles: File[] = [];
  fileNames: string[] = [];
  deletedFiles: string[] = [];
  constructor(private router: Router,
    private translocoService: TranslocoService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef, 
    private fb: FormBuilder, 
    private projectService:ProyectoService, 
    private operationService:OperationsService,
    private snackBar: MatSnackBar){}

  ngOnInit(): void {
    // Crear el formulario reactivo con los nuevos campos
    this.proyectoForm = this.fb.group({
      operacion: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      script_text: [null],
      entradas: [0, [Validators.required]],
      salidas: [0, [Validators.required]],
      confi: ['']
    });
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
      this.isEditMode = !!this.proyectoId;
      
      this.translocoService.langChanges$.subscribe(() => {
        this.modificar = this.isEditMode
          ? this.translocoService.translate('modificarOperacion.modify')
          : this.translocoService.translate('modificarOperacion.create');
      });
      if (this.isEditMode) {
        this.operationService.getOperationById(this.proyectoId).subscribe((data) => {
          this.proyectoDataID = data;
          this.fillFormWithData(this.proyectoDataID);
        });
      }
    });
  }

  fillFormWithData(data: any): void {
    if (!data) {
      this.snackBar.open('Datos vacíos para rellenar el formulario', 'Cerrar', { duration: 3000 });
      return;
    }
    this.originalProyectoData = { ...data }; // Guardamos los datos originales
    this.proyectoForm.patchValue({
      operacion: data.operacion || '',
      descripcion: data.descripcion || '',
      entradas: data.entradas || 0, // Nuevo campo
      salidas: data.salidas || 0,   // Nuevo campo
    });
    this.fileNames = data.script_text ? data.script_text.split(',') : [];
    this.fileName = data.script_text || '';
  }

  isFormModified(): boolean {
    if (!this.isEditMode) return true;
    if (!this.originalProyectoData) return false;
    const currentValues = this.proyectoForm.value;
  
    return (
      currentValues.operacion !== this.originalProyectoData.operacion ||
      currentValues.descripcion !== this.originalProyectoData.descripcion ||
      this.fileNames.join(',') !== (this.originalProyectoData.script_text || '') ||
      currentValues.entradas !== this.originalProyectoData.entradas ||
      currentValues.salidas !== this.originalProyectoData.salidas 
    );
  }
   
  openFileInput(event: MouseEvent): void {
    event.stopPropagation();
    this.fileInput.nativeElement.click();
  }
  
  onFileChange(event: any): void {
  const files: FileList = event.target.files;
    if (files.length > 0) {
      const selectedFile = files[0]; // Tomar solo el primer archivo seleccionado

      // Si había un archivo anterior lo reemplazamos
      this.selectedFiles = [selectedFile];
      this.fileNames = [`${selectedFile.name}`];

      // Asegurar que el formControl se actualiza con el nuevo archivo
      this.proyectoForm.get('script_text')?.setValue(null);

      // Si ya había un archivo de la base de datos, eliminarlo de la lista de archivos existentes
      if (this.proyectoDataID?.script_text) {
        this.deletedFiles = [this.proyectoDataID.script_text];
      }

      const formData = new FormData();
      formData.append('operacion', this.proyectoForm.get('operacion')?.value);
      formData.append('descripcion', this.proyectoForm.get('descripcion')?.value);
      formData.append('entradas', this.proyectoForm.get('entradas')?.value);
      formData.append('salidas', this.proyectoForm.get('salidas')?.value);
      formData.append('confi', this.proyectoForm.get('confi')?.value);

      if (this.selectedFiles.length > 0) {
        this.selectedFiles.forEach(file => {
          formData.append('script_text', file, file.name);
        });
      } else if (this.fileNames.length > 0) {
        formData.append('existingFiles', JSON.stringify(this.fileNames));
      }

      if (this.deletedFiles.length > 0) {
        formData.append('deletedFiles', JSON.stringify(this.deletedFiles));
      }

      // Llamada al servicio con manejo de errores
      this.operationService.runScript(selectedFile.name, formData).pipe(
        catchError((error) => {
          // Manejo del error
          this.snackBar.open(`Error al ejecutar el script ${selectedFile.name}: ${error.message || 'Desconocido'}`, 'Cerrar', { duration: 3000 });
          return of(null);  // Retorna un observable vacío para que el flujo continúe sin interrumpirse
        })
      ).subscribe(
        (response) => {
          if (response) {
            try {
              const outputData = JSON.parse(response.output);
              this.configuracion = outputData.configData.configexample;

              this.proyectoForm.patchValue({
                operacion: outputData.configData.name,
                descripcion: outputData.configData.description,
                entradas: outputData.configData.input,
                salidas: outputData.configData.output,
                confi: outputData.configData.configexample
              });

              this.snackBar.open(`Formulario actualizado con los datos de la operación: ${this.proyectoForm.get('operacion')?.value}`, 'Cerrar', { duration: 3000 });
            } catch (error) {
              this.snackBar.open(`Error al parsear el JSON: ${error.message || 'Desconocido'}`, 'Cerrar', { duration: 3000 });
            }
          }
        }
      );
    }
  }  
  
  onSubmit(event: Event): void {
    event.preventDefault();
  
    if (this.proyectoForm.invalid || !this.isFormModified()) {
      return;
    }
  
    const formData = new FormData();
    formData.append('operacion', this.proyectoForm.get('operacion')?.value);
    formData.append('descripcion', this.proyectoForm.get('descripcion')?.value);
    formData.append('entradas', this.proyectoForm.get('entradas')?.value);
    formData.append('salidas', this.proyectoForm.get('salidas')?.value);
    formData.append('confi', this.proyectoForm.get('confi')?.value);
  
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('script_text', file, file.name);
      });
    } else if (this.fileNames.length > 0) {
      formData.append('existingFiles', JSON.stringify(this.fileNames));
    }
  
    if (this.deletedFiles.length > 0) {
      formData.append('deletedFiles', JSON.stringify(this.deletedFiles));
    }
  
    const handleSuccess = (message: string) => {
      this.snackBar.open(message, 'Cerrar', {
        duration: 3000,
        panelClass: ['snack-bar-success'],
      });
      this.router.navigate(['/operaciones']);
    };
  
    const handleError = (error: any) => {
      const errorMessage = error?.message || 'Error desconocido';
      this.snackBar.open(`Error: ${errorMessage}`, 'Cerrar', { duration: 3000 });
      return of(null); // Continúa con el flujo sin interrumpir la ejecución
    };
  
    if (this.isEditMode) {
      this.operationService.updateOperation(this.proyectoId, formData).pipe(
        catchError(handleError) // Manejo de errores
      ).subscribe(
        () => handleSuccess('Operación actualizada correctamente'),
        (error) => {} // No es necesario manejar aquí, ya lo manejamos en catchError
      );
    } else {
      this.operationService.addOperation(formData).pipe(
        catchError(handleError) // Manejo de errores
      ).subscribe(
        () => handleSuccess('Operación creada correctamente'),
        (error) => {} // No es necesario manejar aquí, ya lo manejamos en catchError
      );
    }
  }
  
  onCancel(event?: Event): void {
    if (event) event.preventDefault();
    const dialogRef = this.dialog.open(CancelDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Si el usuario confirmó, redirige a la página anterior
        this.router.navigate(['/operaciones']);
      }
    });
  }

  onBack() {
    this.router.navigate(['/operaciones']);
  }

  removeFile(index: number): void {
    const fileName = this.fileNames[index];
  
    // Si el archivo ya estaba en el servidor, lo marcamos como eliminado
    if (this.proyectoDataID.script_text.includes(fileName)) {
      this.deletedFiles.push(fileName);
    } else {
      // Si es un archivo recién agregado, lo eliminamos
      this.selectedFiles = this.selectedFiles.filter(file => file.name !== fileName);
    }
  
    // Actualizar la lista de archivos visibles
    this.fileNames.splice(index, 1);
  }  
  
  // Convertir Array de archivos en FileList
  convertToFileList(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }

  isFileUploaded(fileName: string): boolean {
    // Verifica si el archivo existe en la lista de archivos subidos en el servidor
    return this.proyectoDataID?.script_text?.includes(fileName);
  }
  
  downloadFile(filename: string, name: string, id: number): void {
    event.preventDefault();
  
    // Comprobar si el archivo está en los seleccionados pero aún no subidos
    if (!this.isFileUploaded(filename)) {
      this.snackBar.open(
        `El archivo "${filename}" aún no ha sido subido.`,
        'Cerrar',
        { duration: 3000, panelClass: ['snack-bar-error'] }
      );
      return;
    }
  
    // Si el archivo ya está en la lista de archivos subidos, permitir la descarga
    if (this.fileNames.includes(filename)) {
      this.operationService.downloadFile(filename, name, id).pipe(
        catchError((error) => {
          this.snackBar.open(
            `Error al descargar el archivo "${filename}".`,
            'Cerrar',
            { duration: 3000, panelClass: ['snack-bar-error'] }
          );
          return of(null); // No interrumpe el flujo
        })
      ).subscribe(
        (blob: Blob) => {
          if (blob) {
            const link = document.createElement('a');
            const url = window.URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(url); // Limpiar URL creada
          }
        }
      );
    } else {
      this.snackBar.open(
        `No existe el archivo "${filename}" en el servidor.`,
        'Cerrar',
        { duration: 3000, panelClass: ['snack-bar-error'] }
      );
    }
  }
}

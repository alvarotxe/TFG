import { Component, ViewEncapsulation, ViewChild, AfterViewInit,ElementRef,ChangeDetectorRef     } from '@angular/core';
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

@Component({
  selector: 'app-operacion-datos',
  standalone: true,
  imports: [MatIconModule,MatDialogModule,MatSelectModule,TranslocoModule,MatDatepickerModule,MatSlideToggleModule,FormsModule,MatSortModule,MatPaginatorModule,MatTableModule,MatSnackBarModule,CommonModule,ReactiveFormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatTabsModule],
  templateUrl: './operacion-datos.component.html',
})
export class OperacionDatosComponent {
  originalProyectoData: any = null;
  activeTab: string = 'datos-operacion';
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('fileInput') fileInput: ElementRef;
  proyectoForm: FormGroup;
  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;
  isEditMode: boolean = false; 
  modificar: string = '';
  selectedFiles: File[] = [];
  fileNames: string[] = [];
  deletedFiles: string[] = [];
  constructor(private router: Router,private translocoService: TranslocoService,private route: ActivatedRoute,private dialog: MatDialog,private cdr: ChangeDetectorRef, private fb: FormBuilder, private projectService:ProyectoService, private operationService:OperationsService,private snackBar: MatSnackBar){}
  fileName: string = '';
  ngOnInit(): void {
    // Crear el formulario reactivo con los nuevos campos
    this.proyectoForm = this.fb.group({
      operacion: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      script_text: [null],
      entradas: [0, [Validators.required]], // Nuevo campo
      salidas: [0, [Validators.required]],  // Nuevo campo
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
      console.error('Datos vacíos para rellenar el formulario');
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
      currentValues.entradas !== this.originalProyectoData.entradas ||  // Nuevo campo
      currentValues.salidas !== this.originalProyectoData.salidas       // Nuevo campo
    );
  }
   
  openFileInput(event: MouseEvent): void {
    event.stopPropagation(); // Evita que el evento se propague y afecte otros comportamientos.
    this.fileInput.nativeElement.click(); // Esto abrirá el selector de archivos sin enviar el formulario.
  }
  
  onFileChange(event: any): void {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const selectedFile = files[0]; // Tomar solo el primer archivo seleccionado
  
      // Si había un archivo anterior (tanto en la base de datos como seleccionado manualmente), lo reemplazamos
      this.selectedFiles = [selectedFile];
      this.fileNames = [`${selectedFile.name}`]; // Mostrar solo el nuevo archivo seleccionado
  
      // Asegurar que el formControl se actualiza con el nuevo archivo
      this.proyectoForm.get('script_text')?.setValue(null);
  
      // Si ya había un archivo de la base de datos, eliminarlo de la lista de archivos existentes
      if (this.proyectoDataID?.script_text) {
        this.deletedFiles = [this.proyectoDataID.script_text]; // Marcar el anterior como eliminado
      }
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
    formData.append('entradas', this.proyectoForm.get('entradas')?.value); // Nuevo campo
    formData.append('salidas', this.proyectoForm.get('salidas')?.value);   // Nuevo campo
  
    // Enviar archivos nuevos (si hay)
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('script_text', file, file.name);
      });
    } else if (this.fileNames.length > 0) {
      formData.append('existingFiles', JSON.stringify(this.fileNames));
    }
  
    // Enviar archivos eliminados (si hay)
    if (this.deletedFiles.length > 0) {
      formData.append('deletedFiles', JSON.stringify(this.deletedFiles));
    }
  
    if (this.isEditMode) {
      this.operationService.updateOperation(this.proyectoId, formData).subscribe(
        (response) => {
          this.snackBar.open('Proyecto actualizado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snack-bar-success'],
          });
          this.router.navigate(['/operaciones']);
        },
        (error) => {
          console.error('Error al actualizar el proyecto', error);
        }
      );
    } else {
      this.operationService.addOperation(formData).subscribe(
        (response) => {
          this.snackBar.open('Proyecto creado correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snack-bar-success'],
          });
          this.router.navigate(['/operaciones']);
        },
        (error) => {
          console.error('Error al crear el proyecto', error);
        }
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
      // Si es un archivo recién agregado, lo eliminamos de `selectedFiles`
      this.selectedFiles = this.selectedFiles.filter(file => file.name !== fileName);
    }
  
    // Actualizar la lista de archivos visibles sin perder los que quedan
    this.fileNames.splice(index, 1);
  }  
  
  // Convertir Array de archivos en FileList (porque FileList no se puede modificar directamente)
  convertToFileList(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }

  isFileUploaded(fileName: string): boolean {
    // Verifica si el archivo existe en la lista de archivos subidos en el servidor
    return this.proyectoDataID?.script_text?.includes(fileName);
  }
  
  
  // Método para descargar un archivo (si ya está en el servidor)
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
      const fileUrl = `http://localhost:3000/operaciones/scripts/${filename}/${name}/${id}`;
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = filename;
      link.click();
    } else {
      this.snackBar.open(
        `No existe el archivo "${filename}" en el servidor.`,
        'Cerrar',
        { duration: 3000, panelClass: ['snack-bar-error'] }
      );
    }
  }
}

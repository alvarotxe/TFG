import { Component, ViewChild, ElementRef } from '@angular/core';
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
import { ProyectoService } from '../../../services/proyectos.service'
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-datos',
  standalone: true,
  imports: [MatIconModule,MatDialogModule,TranslocoModule,MatDatepickerModule,MatSlideToggleModule,FormsModule,MatSortModule,MatPaginatorModule,MatTableModule,MatSnackBarModule,CommonModule,ReactiveFormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatTabsModule],
  templateUrl: './datos.component.html',
})
export class DatosComponent {
  originalProyectoData: any = null;
  activeTab: string = 'datos-proyecto';
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
  fileName: string = '';
  deletedFiles: string[] = [];
  constructor(private router: Router,
    private translocoService: TranslocoService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private fb: FormBuilder, 
    private projectService:ProyectoService,
    private snackBar: MatSnackBar){}

  ngOnInit(): void {
    // Crear el formulario reactivo
    this.proyectoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      archivo: [null],
    });
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
      console.log(this.proyectoId);
      this.isEditMode = !!this.proyectoId;
      this.translocoService.langChanges$.subscribe(() => {
        this.modificar = this.isEditMode
      ? this.translocoService.translate('modificar.modify')
      : this.translocoService.translate('modificar.create');
      });
      if (this.isEditMode) {
        this.projectService.getProyectoById(this.proyectoId).subscribe((data) => {
          this.proyectoDataID = data;
          console.log(this.proyectoDataID);
          // Rellenar el formulario con los datos obtenidos
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
    this.originalProyectoData = { ...data }; // Guarda los datos originales del proyecto
    this.proyectoForm.patchValue({
      nombre: data.nombre || '',
      descripcion: data.descripcion || '',
    });
    this.fileNames = data.archivo ? data.archivo.split(',') : [];
    // Solo actualiza el nombre del archivo para mostrarlo, no en el campo de tipo "file"
    this.fileName = data.archivo || '';
  }

  isFormModified(): boolean {
    if (!this.isEditMode) {
      return true;
    }
    if (!this.originalProyectoData) {
      return false;
    }
    const currentValues = this.proyectoForm.value;
    
    return (
      currentValues.nombre !== this.originalProyectoData.nombre ||
      currentValues.descripcion !== this.originalProyectoData.descripcion ||
      this.fileNames.join(',') !== (this.originalProyectoData.archivo || '')
    );
  }
   
  openFileInput(event: MouseEvent): void {
    event.stopPropagation();
    this.fileInput.nativeElement.click();
  }

  isFileUploaded(fileName: string): boolean {
    // Verifica si el archivo existe en la lista de archivos subidos en el servidor
    return this.proyectoDataID?.script_text?.includes(fileName);
  }
  
  onFileChange(event: any): void {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      const newFiles = Array.from(files);
      const duplicateFiles: string[] = [];
      newFiles.forEach((file) => {
        if (this.fileNames.includes(file.name)) {
          duplicateFiles.push(file.name);
        } else {
          this.selectedFiles.push(file);
          this.fileNames.push(file.name);
        }
      });
      if (duplicateFiles.length > 0) {
        this.snackBar.open(
          `Los siguientes archivos ya están agregados: ${duplicateFiles.join(', ')}`,
          'Cerrar',
          { duration: 3000, panelClass: ['snack-bar-error'] }
        );
      }
      // Actualizar el formulario
      this.proyectoForm.get('archivo')?.setValue(null); // Evita el error sin intentar asignar archivos
    }
  }  
  
  onSubmit(event: Event): void {
    event.preventDefault();
  
    if (this.proyectoForm.invalid || !this.isFormModified()) {
      return;
    }
  
    const formData = new FormData();
    formData.append('nombre', this.proyectoForm.get('nombre')?.value);
    formData.append('descripcion', this.proyectoForm.get('descripcion')?.value);
  
    // Archivos nuevos
    if (this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('archivo[]', file, file.name);
      });
    } else if (this.fileNames.length > 0) {
      formData.append('existingFiles', JSON.stringify(this.fileNames));
    }
  
    // Archivos eliminados
    if (this.deletedFiles.length > 0) {
      formData.append('deletedFiles', JSON.stringify(this.deletedFiles));
    }
  
    const successMessage = this.isEditMode 
      ? 'Proyecto actualizado correctamente' 
      : 'Proyecto creado correctamente';
    const errorMessage = this.isEditMode 
      ? 'Error al actualizar el proyecto' 
      : 'Error al crear el proyecto';
  
    const request$ = this.isEditMode 
      ? this.projectService.updateProyecto(this.proyectoId, formData) 
      : this.projectService.addProyecto(formData);
  
    request$.pipe(
      tap(() => {
        this.snackBar.open(successMessage, 'Cerrar', {
          duration: 3000,
          panelClass: ['snack-bar-success'],
        });
        this.router.navigate(['/proyectos']);
      }),
      catchError((error) => {
        console.error(errorMessage, error);
        this.snackBar.open(errorMessage, 'Cerrar', {
          duration: 3000,
          panelClass: ['snack-bar-error'],
        });
        return of(null); // Continuar el flujo incluso si hay error
      })
    ).subscribe();
  }
  
  onCancel(event?: Event): void {
    if (event) event.preventDefault();
    const dialogRef = this.dialog.open(CancelDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Si el usuario confirmó, redirige a la página anterior
        this.router.navigate(['/proyectos']);
      }
    });
  }

  onBack() {
    this.router.navigate(['/proyectos']);
  }

  removeFile(index: number): void {
    const fileName = this.fileNames[index];
  
    // Si el archivo ya estaba en el servidor, lo marcamos como eliminado
    if (this.proyectoDataID.archivo.includes(fileName)) {
      this.deletedFiles.push(fileName);
    } else {
      this.selectedFiles = this.selectedFiles.filter(file => file.name !== fileName);
    }
  
    // Actualizar la lista de archivos visibles sin perder los que quedan
    this.fileNames.splice(index, 1);
  }  
  
  // Convertir Array de archivos en FileList
  convertToFileList(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }
  
  // Método para descargar un archivo (si ya está en el servidor)
  downloadFile(filename: string, name: string, id: number): void {
    event.preventDefault();
  
    // Verificar si el archivo está en la lista de seleccionados pero aún no subidos
    if (this.selectedFiles.some(file => file.name === filename)) {
      this.snackBar.open(
        `El archivo "${filename}" aún no se ha subido.`,
        'Cerrar',
        { duration: 3000, panelClass: ['snack-bar-error'] }
      );
      return;
    }
    // Verificar si el archivo ya está en la lista de archivos subidos
    if (this.fileNames.includes(filename)) {
      this.projectService.downloadFile(filename, name, id).pipe(
        tap((blob: Blob) => {
          const link = document.createElement('a');
          const url = window.URL.createObjectURL(blob);
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
        }),
        catchError((error) => {
          console.error(`Error al descargar el archivo "${filename}"`, error);
          this.snackBar.open(
            `Error al descargar el archivo "${filename}".`,
            'Cerrar',
            { duration: 3000, panelClass: ['snack-bar-error'] }
          );
          return of(null); // Continuar el flujo incluso en caso de error
        })
      ).subscribe();
    } else {
      this.snackBar.open(
        `No existe el archivo "${filename}" en el servidor.`,
        'Cerrar',
        { duration: 3000, panelClass: ['snack-bar-error'] }
      );
    }
  }
}

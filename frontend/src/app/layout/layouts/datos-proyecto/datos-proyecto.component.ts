import { Component, ViewEncapsulation, ViewChild, AfterViewInit,ElementRef,ChangeDetectorRef     } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { TranslocoHttpLoader } from '../../../core/transloco/transloco.http-loader';
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
import { DatosComponent } from '../datos/datos.component';
import { FlujoComponent } from '../flujo/flujo.component';
import { CancelDialogComponent } from '../../common/cancel-dialog/cancel-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ProyectoService } from '../../../services/proyectos.service'
import { FormGroup,FormControl, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'datos-proyecto',
  standalone: true,
  imports: [CdkScrollable, MatIconModule,DatosComponent,TranslocoModule,FlujoComponent,MatDialogModule,MatDatepickerModule,MatSlideToggleModule,FormsModule,MatSortModule,MatPaginatorModule,MatTableModule,MatSnackBarModule,CommonModule,ReactiveFormsModule, MatInputModule, MatFormFieldModule, RouterLink, MatButtonModule, MatTabsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './datos-proyecto.component.html',
})
export class DatosProyectoComponent {
  activeTab: string = 'datos-proyecto';
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('fileInput') fileInput: ElementRef;
  proyectoForm: FormGroup;
  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;
  isEditMode: boolean = false; 
  isAddMode: boolean = false;
  buttonText: string = 'Añadir Proyecto';
  displayedColumns: string[] = ['name','select'];
  showOperationsSelector = false;
  selectedOperations: any[] = [];
  addedOperaaciones = [];

  constructor(private router: Router,private route: ActivatedRoute,private translocoService: TranslocoService,private dialog: MatDialog,private cdr: ChangeDetectorRef, private fb: FormBuilder, private projectService:ProyectoService,private snackBar: MatSnackBar){}
  fileName: string = '';
  ngOnInit(): void {
    // Crear el formulario reactivo
    this.proyectoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      archivo: [null], // El archivo no es obligatorio al editar
    });
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
      console.log(this.proyectoId);
      this.isEditMode = !!this.proyectoId; // Si hay ID, estamos en edición

      // Cambiar el texto del botón según el modo
      this.buttonText = this.isEditMode ? 'Modificar Proyecto' : 'Añadir Proyecto';

      if (this.isEditMode) {
        // Obtener los datos del proyecto usando el ID
        this.projectService.getProyectoById(this.proyectoId).subscribe((data) => {
          this.proyectoDataID = data;
          console.log(this.proyectoDataID);
        });
      }
    });
  }

  onTabChange(event: any): void {
    // Cambia entre las tabs
    if (event.index === 0) {
      this.activeTab = 'datos-proyecto';
      // Hacer algo si es el tab de Datos Proyecto
    } else if (event.index === 1) {
      this.activeTab = 'flujo-operaciones';
      // Hacer algo si es el tab de Flujo de Operaciones
    }
  }

  onBack() {
    this.router.navigate(['/proyectos']);
  }

}


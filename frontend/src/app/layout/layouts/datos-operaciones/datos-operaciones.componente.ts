import { Component, ViewEncapsulation, ViewChild, ElementRef} from '@angular/core';
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
import { OperacionDatosComponent } from '../operacion-datos/operacion-datos.component';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'datos-operaciones',
  standalone: true,
  imports: [CdkScrollable, MatIconModule,OperacionDatosComponent,TranslocoModule,MatDialogModule,MatDatepickerModule,MatSlideToggleModule,FormsModule,MatSortModule,MatPaginatorModule,MatTableModule,MatSnackBarModule,CommonModule,ReactiveFormsModule, MatInputModule, MatFormFieldModule, RouterLink, MatButtonModule, MatTabsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './datos-operaciones.componente.html',
})
export class DatosOperacionesComponent {
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('fileInput') fileInput: ElementRef;

  proyectoForm: FormGroup;
  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;

  activeTab: string = 'datos-operaciones';

  constructor(private router: Router,
    private route: ActivatedRoute,
    private translocoService: TranslocoService,
    private fb: FormBuilder){}

  ngOnInit(): void {
    // Crear el formulario reactivo
    this.proyectoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      archivo: [null], // El archivo no es obligatorio al editar
    });
    this.route.queryParams.subscribe((params) => {
      this.proyectoId = params['id'] || null;
    });
  }

  onBack() {
    this.router.navigate(['/operaciones']);
  }
}


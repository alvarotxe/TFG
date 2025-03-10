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
import { FormsModule } from '@angular/forms';

interface Operation {
    name: string;
    active: boolean;
    selectedControl: FormControl;
    draggable?: boolean;
     // Propiedad adicional
  }

@Component({
  selector: 'app-config-dialog',
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.css'],
  imports:[MatPaginator,ReactiveFormsModule,FormsModule,MatIconModule,MatMenuModule,MatButtonModule,MatDialogModule,TranslocoModule,MatCheckboxModule,MatTooltipModule,CommonModule,MatTableModule,MatInputModule,MatFormFieldModule],
  standalone   : true,
})
export class ConfigDialogComponent {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() selectionChange = new EventEmitter<any[]>();

  proyectoId: string | null = null;
  proyectoData: any = null;
  proyectoDataID: any = null;
  configValue: string;
  operationsList: any[];
  selectedOperations: any[] = [];
  filteredOperations: MatTableDataSource<any>;
  descriptionVisible = false;
  pageSize = 4;
  projectId: number;
  archivo:any;

  constructor(
    public dialogRef: MatDialogRef<ConfigDialogComponent>,private router: Router,private route: ActivatedRoute,private projectService:ProyectoService,private operationsService: OperationsService,private fb: FormBuilder,private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { config: string }
  ) {
    this.filteredOperations = new MatTableDataSource(this.operationsList);
    this.configValue = data.config;
  }

  save() {
    this.dialogRef.close(this.configValue); // Devuelve el valor actualizado
  }

  close() {
    this.dialogRef.close(null); // No se hacen cambios
  }
}

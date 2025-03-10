import { Routes } from '@angular/router';
import { DatosOperacionesComponent } from 'app/layout/layouts/datos-operaciones/datos-operaciones.componente';
import { DatosProyectoComponent } from 'app/layout/layouts/datos-proyecto/datos-proyecto.component';

export default [
    {
        path     : '',
        component: DatosOperacionesComponent,
    },
] as Routes;

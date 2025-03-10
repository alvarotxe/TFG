import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule, TRANSLOCO_CONFIG, TRANSLOCO_LOADER } from '@ngneat/transloco';
import { TranslocoHttpLoader } from './core/transloco/transloco.http-loader';

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss'],
    standalone : true,
    imports    : [RouterOutlet,TranslocoModule,ReactiveFormsModule,MatFormFieldModule,MatInputModule],
})
export class AppComponent
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}

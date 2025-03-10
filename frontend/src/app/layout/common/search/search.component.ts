import { Overlay } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NgClass, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, HostBinding, inject, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_AUTOCOMPLETE_SCROLL_STRATEGY, MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { fuseAnimations } from '@fuse/animations/public-api';
import { ProyectoService } from '../../../services/proyectos.service';
import { debounceTime, filter, map, Subject, takeUntil } from 'rxjs';
import { FormControl } from '@angular/forms';

@Injectable({
    providedIn: 'root'
  })

@Component({
    selector     : 'search',
    templateUrl  : './search.component.html',
    encapsulation: ViewEncapsulation.None,
    exportAs     : 'fuseSearch',
    animations   : fuseAnimations,
    standalone   : true,
    imports      : [NgIf, MatButtonModule, MatIconModule, FormsModule, MatAutocompleteModule, ReactiveFormsModule, MatOptionModule, NgFor, RouterLink, NgTemplateOutlet, MatFormFieldModule, MatInputModule, NgClass],
    providers    : [
        {
            provide   : MAT_AUTOCOMPLETE_SCROLL_STRATEGY,
            useFactory: () =>
            {
                const overlay = inject(Overlay);
                return () => overlay.scrollStrategies.block();
            },
        },
    ],
})
export class SearchComponent implements OnChanges, OnInit, OnDestroy
{
    @Output() searchQuery = new EventEmitter<string>();
    searchControl = new FormControl('');
    @Input() appearance: 'basic' | 'bar' = 'basic';
    @Input() debounce: number = 300;
    @Input() minLength: number = 2;
    @Output() search: EventEmitter<any> = new EventEmitter<any>();

    opened: boolean = false;
    resultSets: any[] = [];
    //searchControl: UntypedFormControl = new UntypedFormControl();
    private _matAutocomplete: MatAutocomplete;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _elementRef: ElementRef,
        private _httpClient: HttpClient,
        private _renderer2: Renderer2,
        private proyectoService: ProyectoService,
        
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any
    {
        return {
            'search-appearance-bar'  : this.appearance === 'bar',
            'search-appearance-basic': this.appearance === 'basic',
            'search-opened'          : this.opened,
        };
    }

    /**
     * Setter for bar search input
     *
     * @param value
     */
    @ViewChild('barSearchInput')
    set barSearchInput(value: ElementRef)
    {
        // If the value exists, it means that the search input
        // is now in the DOM, and we can focus on the input..
        if ( value )
        {
            // Give Angular time to complete the change detection cycle
            setTimeout(() =>
            {
                // Focus to the input element
                value.nativeElement.focus();
            });
        }
    }

    /**
     * Setter for mat-autocomplete element reference
     *
     * @param value
     */
    @ViewChild('matAutocomplete')
    set matAutocomplete(value: MatAutocomplete)
    {
        this._matAutocomplete = value;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void
    {
        // Appearance
        if ( 'appearance' in changes )
        {
            // To prevent any issues, close the
            // search after changing the appearance
            this.close();
        }
    }

    /**
     * On init
     */
    ngOnInit(): void {

        this.searchControl.valueChanges.subscribe(value => {
            this.searchQuery.emit(value);  // Emitimos el valor de búsqueda
          });

        if (!this.searchControl) {
          console.error('searchControl no está definido');
          return;
        }
    
        this.searchControl.valueChanges
          .pipe(
            debounceTime(this.debounce),
            takeUntil(this._unsubscribeAll),
            map((value) => {
              if (!value || typeof value !== 'string' || value.trim().length < this.minLength) {
                this.resultSets = []; // Limpia los resultados si la búsqueda no es válida
                return '';
              }
              return value;
            }),
            filter(value => value && value.length >= this.minLength),
          )
          .subscribe((value) => {
            if (value) {
              console.log('Realizando búsqueda con valor:', value);
              this.proyectoService.searchProyectos(value)
                .subscribe(
                  (resultSets: any) => {
                    if (resultSets && resultSets.length > 0) {
                      this.resultSets = resultSets;  // Aquí actualizamos el array de resultados
                    } else {
                      console.log('No se encontraron proyectos en la respuesta');
                      this.resultSets = []; // Si no hay proyectos, limpiamos la lista
                    }
                  },
                  (error) => {
                    console.error('Error en la búsqueda:', error);
                    this.resultSets = [];  // Limpia si hay error
                  }
                );
            }
          });
      }
      
      
     
      

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * On keydown of the search input
     *
     * @param event
     */
    onKeydown(event: KeyboardEvent): void
    {
        // Escape
        if ( event.code === 'Escape' )
        {
            // If the appearance is 'bar' and the mat-autocomplete is not open, close the search
            if ( this.appearance === 'bar' && !this._matAutocomplete.isOpen )
            {
                this.close();
            }
        }
    }

    /**
     * Open the search
     * Used in 'bar'
     */
    open(): void
    {
        // Return if it's already opened
        if ( this.opened )
        {
            return;
        }

        // Open the search
        this.opened = true;
    }

    /**
     * Close the search
     * * Used in 'bar'
     */
    close(): void
    {
        // Return if it's already closed
        if ( !this.opened )
        {
            return;
        }

        // Clear the search input
        this.searchControl.setValue('');

        // Close the search
        this.opened = false;
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }
}

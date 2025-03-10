import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperacionDatosComponent } from './operacion-datos.component';

describe('DatosComponent', () => {
  let component: OperacionDatosComponent;
  let fixture: ComponentFixture<OperacionDatosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperacionDatosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OperacionDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

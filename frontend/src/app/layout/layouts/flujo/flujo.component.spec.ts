import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlujoComponent } from './flujo.component';

describe('FlujoComponent', () => {
  let component: FlujoComponent;
  let fixture: ComponentFixture<FlujoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlujoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FlujoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeccionUsuarios } from './seccion-usuarios';

describe('SeccionUsuarios', () => {
  let component: SeccionUsuarios;
  let fixture: ComponentFixture<SeccionUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionUsuarios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeccionUsuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

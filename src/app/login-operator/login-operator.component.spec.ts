import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginOperatorComponent } from './login-operator.component';

describe('LoginOperatorComponent', () => {
  let component: LoginOperatorComponent;
  let fixture: ComponentFixture<LoginOperatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginOperatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginOperatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

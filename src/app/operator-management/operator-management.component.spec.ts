import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatorManagementComponent } from './operator-management.component';

describe('OperatorManagementComponent', () => {
  let component: OperatorManagementComponent;
  let fixture: ComponentFixture<OperatorManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperatorManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatorArchiveComponent } from './operator-archive.component';

describe('OperatorArchiveComponent', () => {
  let component: OperatorArchiveComponent;
  let fixture: ComponentFixture<OperatorArchiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorArchiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperatorArchiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

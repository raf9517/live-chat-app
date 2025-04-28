import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotFlowEditorComponent } from './bot-flow-editor.component';

describe('BotFlowEditorComponent', () => {
  let component: BotFlowEditorComponent;
  let fixture: ComponentFixture<BotFlowEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotFlowEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BotFlowEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

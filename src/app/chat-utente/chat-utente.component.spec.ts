import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatUtenteComponent } from './chat-utente.component';

describe('ChatUtenteComponent', () => {
  let component: ChatUtenteComponent;
  let fixture: ComponentFixture<ChatUtenteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatUtenteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatUtenteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

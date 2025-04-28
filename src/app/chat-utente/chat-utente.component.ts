import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-chat-utente',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  templateUrl: './chat-utente.component.html',
})
export class ChatUtenteComponent implements OnInit {
  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;
  chatId!: string;
  canShowWindow = false;

  ngOnInit(): void {
    this.scrollToBottom();
    let chatId = localStorage.getItem('chat_uid');

    if (!chatId) {
      chatId = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('chat_uid', chatId);
      console.log('🆕 Nuovo utente creato con chatId:', chatId);
    } else {
      console.log('✅ Utente già esistente – chatId:', chatId);
    }

    // ⏳ Mostra la chat solo dopo aver settato il valore
    setTimeout(() => {
      this.canShowWindow = true;
    });
  }

  scrollToBottom(smooth: boolean = true) {
    setTimeout(() => {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTo({
          top: this.chatBody.nativeElement.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }, 100);
  }
}

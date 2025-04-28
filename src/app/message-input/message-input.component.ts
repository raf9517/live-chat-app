import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { BotService } from '../bot/bot-flow-editor/bot.service';

@Component({
  selector: 'message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
})
export class MessageInputComponent {
  @Input() chatId!: string;
  @Output() messageSent = new EventEmitter<void>();

  message = '';
  standaloneMode = false;

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  constructor(private botService: BotService) {}

  ngOnInit() {
    this.standaloneMode = window.location.pathname.includes('/utente');
  }

  async sendMessage() {
    const senderId = localStorage.getItem('chat_uid') ?? 'operatore';
    if (!this.chatId || !this.message.trim()) {
      console.warn('⛔ Messaggio non inviato: chatId o testo mancante');
      return;
    }
    const messagesRef = collection(
      this.firestore,
      'chats',
      this.chatId,
      'messages'
    );
    await addDoc(messagesRef, {
      senderId,
      content: this.message.trim(),
      timestamp: serverTimestamp(),
    });
    const isUser = senderId !== 'operatore';
    const chatUpdates: any = {
      lastMessage: this.message.trim(),
      lastUpdated: serverTimestamp(),
    };
    if (isUser) {
      chatUpdates.archived = false;
      chatUpdates.unreadByOperator = true;
      const chatDoc = await getDoc(doc(this.firestore, 'chats', this.chatId));
      const chatData = chatDoc.data();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (chatData?.['escalatedToHuman']) {
        console.log('🙅‍♂️ Chat gestita da operatore, non analizzo keyword.');
      } else {
        const keywordMatched = await this.checkKeywordAndRespond(
          this.message.trim().toLowerCase()
        );
        if (keywordMatched) {
          // await this.checkKeywordAndRespond(this.message.trim().toLowerCase());
          await this.resetBotState(this.chatId);
          return;
        }
      }
    }
    await setDoc(doc(this.firestore, 'chats', this.chatId), chatUpdates, {
      merge: true,
    });
    this.message = '';
    this.messageSent.emit();
    if (isUser) {
      await this.checkAndStartBotWithDelay();
      await this.botService.handleFreeInput(this.chatId, this.message.trim());
    }
    const textarea = document.querySelector(
      '.message-textarea'
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  async checkAndStartBotWithDelay() {
    const ref = doc(this.firestore, 'chats', this.chatId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const state = data['botState'];
    const escalated = data['escalatedToHuman'];
    if (escalated === 'true') return;
    if (state === null) {
      await this.botService.sendBotMessage(this.chatId, 'start');
    }
    if ((!state || state === 'start') && !escalated) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await this.botService.sendBotMessage(this.chatId, 'start');
    }
  }

  // function of Keyword
  async checkKeywordAndRespond(message: string): Promise<any> {
    const botNodesSnap = await getDocs(collection(this.firestore, 'botFlow'));
    const botNodes = botNodesSnap.docs.map(
      (doc: { id: any; data: () => any }) => ({ id: doc.id, ...doc.data() })
    );
    for (const node of botNodes) {
      if (node.keywords?.length) {
        for (const keyword of node.keywords) {
          if (message.includes(keyword.toLowerCase())) {
            await this.resetBotState(this.chatId);
            await this.botService.sendBotMessage(this.chatId, node.id);
            return true;
          }
        }
      }
    }
    return false;
  }

  // insert a botstate post event
  async resetBotState(chatId: string) {
    const chatDocRef = doc(this.firestore, 'chats', chatId);

    await setDoc(
      chatDocRef,
      {
        botState: null, // oppure null se vuoi proprio azzerare
      },
      { merge: true }
    );
  }
}

import {
  Component,
  OnInit,
  OnChanges,
  Input,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  getDoc, // ✅ aggiungilo
} from '@angular/fire/firestore';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { collectionData } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { MessageInputComponent } from '../message-input/message-input.component';
import { ActivatedRoute } from '@angular/router';
import { BotService } from '../bot/bot-flow-editor/bot.service';
import { RichTextPipe } from '../rich-text.pipe';
import { SmartTextPipe } from '../smart-text.pipe';

interface ChatMessage {
  options: any;
  id?: string;
  senderId: string;
  content: string;
  timestamp: any;
}

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, MessageInputComponent, SmartTextPipe],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent implements OnInit, OnChanges, OnDestroy {
  [x: string]: any;
  @Input() chatId?: string; // input generico per routing o dashboard
  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;
  scrollToBottomPending = false;
  showScrollButton = true;
  chatData: { userName?: string } = {};

  messages$!: Observable<ChatMessage[]>;
  currentUserId!: string;
  isOperator = true;
  private routeSub?: Subscription;
  msg: any;
  botTyping = false;

  constructor(
    private firestore: Firestore,
    private route: ActivatedRoute,
    private botService: BotService
  ) {}

  ngOnInit(): void {
    if (!this.chatId) {
      this.routeSub = this.route.paramMap.subscribe((params) => {
        const routeChatId = params.get('id');
        const localChatId = localStorage.getItem('chat_uid');

        if (routeChatId) {
          this.chatId = routeChatId;
          this.currentUserId = 'operatore';
          this.isOperator = true;
        } else if (localChatId) {
          this.chatId = localChatId;
          this.currentUserId = localChatId;
          this.isOperator = false;
        } else {
          console.error('❌ Nessun chatId trovato');
          return;
        }

        this.loadMessages();
        this.checkAndRunBot();
        this.resetUnread();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chatId'] && changes['chatId'].currentValue) {
      this.currentUserId = 'operatore';
      this.isOperator = true;
      this.loadMessages();
      this.resetUnread();
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.chatBody.nativeElement.addEventListener('scroll', () => {
      const el = this.chatBody.nativeElement;
      const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
      this.showScrollButton = !atBottom;
    });
  }

  private resetUnread() {
    if (this.isOperator && this.chatId) {
      updateDoc(doc(this.firestore, 'chats', this.chatId), {
        // unreadByOperator: true,
      });
    }
  }

  async loadMessages() {
    if (!this.chatId) return;

    const chatRef = doc(this.firestore, 'chats', this.chatId);
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const chatInfo = chatSnap.data();
      this.chatData = {
        userName: chatInfo['userName'] || 'utente',
      };
    }
    const messagesRef = collection(
      this.firestore,
      'chats',
      this.chatId,
      'messages'
    );
    const q = query(messagesRef, orderBy('timestamp'));

    this.messages$ = collectionData(q, { idField: 'id' }) as Observable<
      ChatMessage[]
    >;

    this.messages$.subscribe((messages) => {
      const last = messages[messages.length - 1];

      const isIncoming = last?.senderId !== this.currentUserId;
      const isOperator = this.currentUserId === 'operatore';
      if (isIncoming && isOperator) {
        updateDoc(doc(this.firestore, 'chats', this.chatId!), {
          // unreadByOperator: false,
        });
      }
      // Scrolla in fondo dopo aver ricevuto nuovi messaggi
      this.scrollToBottomPending = true;
      setTimeout(() => {
        if (this.scrollToBottomPending) {
          this.scrollToBottom();
          this.scrollToBottomPending = false;
        }
      }, 1000);
    });
    this.checkAndRunBot();
  }

  generateRandomId(): string {
    return 'anon_' + Math.random().toString(36).substring(2, 8);
  }

  getLabel(senderId: string): string {
    if (senderId === this.currentUserId) return 'Tu';
    return this.isOperator ? senderId : '🎧 Supporto';
  }

  async checkAndRunBot() {
    if (!this.chatId) return;

    const ref = doc(this.firestore, 'chats', this.chatId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();
    const state = data['botState'];
    const escalated = data['escalatedToHuman'];

    if (!state && !escalated) {
      await this.triggerBotNode('start');
    }
  }

  async onBotOptionSelected(nextNodeId: string) {
    await this.triggerBotNode(nextNodeId);
  }

  isMyMessage(senderId: string): boolean {
    if (senderId === 'bot_fantacalcio') return false;
    return senderId === this.currentUserId;
  }

  async triggerBotNode(nodeId: string) {
    if (!this.chatId) return;

    this.botTyping = true;
    await new Promise((resolve) => setTimeout(resolve, 2000)); // simula delay
    this.botTyping = false;

    await this.botService.sendBotMessage(this.chatId, nodeId);
  }

  scrollToBottom(smooth: boolean = true) {
    setTimeout(() => {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTo({
          top: this.chatBody.nativeElement.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    }, 0);
  }

  async sendMessageFromOutside(message: string) {
    if (!this.chatId || !message.trim()) return;

    const messagesRef = collection(
      this.firestore,
      'chats',
      this.chatId,
      'messages'
    );
    const timestamp = new Date();

    await addDoc(messagesRef, {
      senderId: 'operatore',
      content: message.trim(),
      timestamp: timestamp,
      options: null,
    });

    // Dopo aver inviato il messaggio, aggiorna il lastUpdated della chat
    await updateDoc(doc(this.firestore, 'chats', this.chatId), {
      lastUpdated: timestamp,
      unreadByOperator: false,
    });

    console.log('✅ Messaggio inviato da ChatBlock');

    // Scrolla in basso
    this.scrollToBottom();
  }
}

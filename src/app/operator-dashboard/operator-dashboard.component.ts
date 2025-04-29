import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  where,
  doc,
  deleteDoc,
  getDocs,
  updateDoc,
  addDoc,
  setDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';
import { ChatWindowComponent } from '../chat-window/chat-window.component';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { FormsModule } from '@angular/forms';
import { ViewChild } from '@angular/core';

// INTERFACCE
interface ChatItem {
  id: string;
  lastMessage?: string;
  lastUpdated?: any;
  unreadByOperator?: boolean;
}

export interface ChatBlock {
  id: string;
  name: string;
  text: string;
  favorite: boolean;
  createdAt: number;
  operatorId: string;
}

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatWindowComponent, FormsModule],
  templateUrl: './operator-dashboard.component.html',
  styleUrls: ['./operator-dashboard.component.scss'],
})
export class OperatorDashboardComponent {
  @ViewChild(ChatWindowComponent)
  chatWindowComponent!: ChatWindowComponent;
  chats$: Observable<ChatItem[]>;
  currentUid: string | null = localStorage.getItem('operatorUid');
  selectedChatId?: string;
  selectedChatId2?: string;
  chatDetailWidth = 50;
  currentUserId: string = '';

  // Variabili per resize chat
  isResizing = false;

  // Stato pannelli extra
  showRightPanel1 = true;
  showRightPanel2 = true;

  // Variabili Chat Block
  chatBlocks: ChatBlock[] = [];
  showBlockForm = false;
  blockForm: Partial<ChatBlock> = {};
  editingBlockId: string | null = null;
  searchQuery = '';
  previewMessage: string = '';
  showPreviewModal: boolean = false;

  online = false;

  private auth = inject(Auth);
  private router = inject(Router);
  operators: any[] = [];
  chatSortMode: 'latest' | 'priority' = 'latest';

  constructor(private firestore: Firestore) {
    const chatsRef = collection(this.firestore, 'chats');
    const q = query(chatsRef, where('assignedTo', '!=', null));
    this.chats$ = collectionData(q, { idField: 'id' }) as Observable<
      ChatItem[]
    >;
  }

  async ngOnInit() {
    this.currentUid = localStorage.getItem('operatorUid');
    this.currentUserId = localStorage.getItem('chat_uid') ?? '';

    await this.loadOperators(); // aspetta di caricare
    if (!this.currentUid) return;
    const chatsRef = collection(this.firestore, 'chats');
    const q = query(chatsRef, where('assignedTo', '==', this.currentUid));
    this.chats$ = collectionData(q, { idField: 'id' }) as Observable<
      ChatItem[]
    >;

    onAuthStateChanged(this.auth, (user) => {
      if (!user) {
        this.router.navigate(['/login']);
      } else {
        console.log('✅ Loggato come:', user.uid);
      }
    });

    this.chats$.subscribe((chats) => {
      const sorted = this.sortChats([...chats]);
      if (sorted?.length && !this.selectedChatId) {
        this.selectChat(sorted[0].id);
      }
    });

    this.loadChatBlocks();
  }

  // CHAT LIST
  selectChat(chatId: string) {
    this.selectedChatId = chatId;
    if (this.selectedChatId) {
      this.selectedChatId2 = this.selectedChatId.substring(0, 2);
    }
  }

  startResizing(event: MouseEvent) {
    this.isResizing = true;
    document.addEventListener('mousemove', this.resizeHandler);
    document.addEventListener('mouseup', this.stopResizing);
  }

  resizeHandler = (event: MouseEvent) => {
    if (!this.isResizing) return;

    const containerWidth = document.querySelector(
      '.dashboard-container'
    )!.clientWidth;
    const leftFixedWidth = containerWidth * 0.2 + 6;

    const newWidth = ((event.clientX - leftFixedWidth) / containerWidth) * 100;

    if (newWidth > 20 && newWidth < 50) {
      this.chatDetailWidth = newWidth;
    }
  };

  stopResizing = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resizeHandler);
    document.removeEventListener('mouseup', this.stopResizing);
  };

  async archiveChat(chatId: string) {
    const confirmed = confirm(`Vuoi archiviare la chat ${chatId}?`);
    if (!confirmed) return;

    await updateDoc(doc(this.firestore, 'chats', chatId), {
      archived: true,
      assignedTo: null,
      escalatedToHuman: false,
      botState: 'start',
    });

    alert(`✅ Chat ${chatId} archiviata`);
  }

  async deleteChat(chatId: string) {
    const confirmed = confirm(`Eliminare definitivamente la chat ${chatId}?`);
    if (!confirmed) return;

    const messagesRef = collection(this.firestore, `chats/${chatId}/messages`);
    const messagesSnap = await getDocs(messagesRef);

    for (const docSnap of messagesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    await deleteDoc(doc(this.firestore, 'chats', chatId));

    alert(`🗑️ Chat ${chatId} eliminata!`);
  }

  async toggleOnlineStatus() {
    if (!this.currentUid) return;

    const operator = this.operators.find((op) => op.uid === this.currentUid);
    if (!operator) return;

    const newOnlineStatus = !operator.online;

    const operatorRef = doc(this.firestore, 'operators', this.currentUid);
    await updateDoc(operatorRef, { online: newOnlineStatus });

    // 🆕 Aggiorna anche localmente
    operator.online = newOnlineStatus;
  }

  // CHAT BLOCKS
  loadChatBlocks() {
    const chatBlocksRef = collection(this.firestore, 'chatBlocks');
    const q = query(chatBlocksRef, where('operatorId', '==', this.currentUid!));
    collectionData(q, { idField: 'id' }).subscribe((blocks: any) => {
      this.chatBlocks = blocks as ChatBlock[];
    });
  }

  filteredChatBlocks(): ChatBlock[] {
    const searchLower = this.searchQuery.toLowerCase();
    return this.chatBlocks
      .filter((block) => block.name.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        if (a.favorite !== b.favorite) {
          return a.favorite ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  openNewBlockForm() {
    this.blockForm = {};
    this.editingBlockId = null;
    this.showBlockForm = true;
  }

  editBlock(block: ChatBlock) {
    this.blockForm = { ...block };
    this.editingBlockId = block.id;
    this.showBlockForm = true;
  }

  cancelBlockForm() {
    this.showBlockForm = false;
  }

  async saveBlock() {
    const id = this.editingBlockId || uuidv4();
    const block: ChatBlock = {
      id,
      name: this.blockForm.name!,
      text: this.blockForm.text!,
      favorite: this.blockForm.favorite || false,
      createdAt: this.editingBlockId
        ? this.chatBlocks.find((b) => b.id === id)?.createdAt || Date.now()
        : Date.now(),
      operatorId: this.currentUid!,
    };

    const chatBlockRef = doc(this.firestore, 'chatBlocks', id);
    await setDoc(chatBlockRef, block);

    this.showBlockForm = false;
  }

  async toggleFavorite(block: ChatBlock) {
    const updatedFavorite = !block.favorite;
    const chatBlockRef = doc(this.firestore, 'chatBlocks', block.id);
    await updateDoc(chatBlockRef, { favorite: updatedFavorite });
  }

  sendBlockText(text: string) {
    this.previewMessage = text;
    this.showPreviewModal = true;
  }

  sendConfirmBlockText() {
    if (this.chatWindowComponent && this.previewMessage.trim()) {
      this.chatWindowComponent.sendMessageFromOutside(
        this.previewMessage.trim()
      );
      this.showPreviewModal = false;
    }
  }

  private async loadOperators(): Promise<void> {
    const snapshot = await getDocs(collection(this.firestore, 'operators'));
    this.operators = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    console.log(this.operators);
  }
  getMyOperatorOnlineStatus(): boolean {
    if (!this.currentUid) return false;
    const myOperator = this.operators.find((op) => op.uid === this.currentUid);
    return myOperator ? myOperator.online === true : false;
  }

  sortChats(chats: ChatItem[]): ChatItem[] {
    if (this.chatSortMode === 'latest') {
      return chats.sort(
        (a, b) => b.lastUpdated?.seconds - a.lastUpdated?.seconds
      );
    }

    if (this.chatSortMode === 'priority') {
      return chats.sort((a, b) => {
        // Se uno ha notifica e l'altro no, lo metti prima
        if (a.unreadByOperator && !b.unreadByOperator) return -1;
        if (!a.unreadByOperator && b.unreadByOperator) return 1;

        // Se entrambi hanno o non hanno notifica → ordina per messaggio più vecchio
        return (a.lastUpdated?.seconds || 0) - (b.lastUpdated?.seconds || 0);
      });
    }

    return chats;
  }

  applySort() {
    this.chats$.subscribe((chats) => {
      this.chats$ = new Observable<ChatItem[]>((observer) => {
        observer.next(this.sortChats([...chats]));
      });
    });
  }

  async markChatAsUnread(chatId: string) {
    await updateDoc(doc(this.firestore, 'chats', chatId), {
      unreadByOperator: true,
    });
    alert(`🔔 La chat ${chatId} è stata segnata come non letta`);
  }

  currentChatHasUnread = false;

  toggleNotification(chatId: string) {
    const newValue = !this.currentChatHasUnread;
    updateDoc(doc(this.firestore, 'chats', chatId), {
      unreadByOperator: newValue,
    }).then(() => {
      this.currentChatHasUnread = newValue;
    });
  }
}

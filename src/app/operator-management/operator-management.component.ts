import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  updateDoc,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-operator-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './operator-management.component.html',
  styleUrls: ['./operator-management.component.scss'],
})
export class OperatorManagementComponent implements OnInit {
  operators: any[] = [];
  chatsToAssign: any[] = [];
  activeChats: any[] = [];

  selectedChats: Set<string> = new Set();
  selectedOperatorUid: string = '';
  filterOperatorUid: string = 'waiting';
  searchTermAssign: string = '';

  // Paginazione Chat Attive
  page: number = 1;
  pageSize: number = 10;

  // Paginazione Chat Assegnare
  pageAssign: number = 1;
  pageSizeAssign: number = 10;

  constructor(private firestore: Firestore) {}

  async ngOnInit(): Promise<void> {
    await this.loadOperators();
    await this.loadChats();
  }

  private async loadOperators(): Promise<void> {
    const snapshot = await getDocs(collection(this.firestore, 'operators'));
    this.operators = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
  }

  private async loadChats(): Promise<void> {
    const snapshot = await getDocs(collection(this.firestore, 'chats'));

    // ✅ Carica tutte le chat senza filtri
    this.chatsToAssign = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    this.activeChats = snapshot.docs
      .filter((doc) => !doc.data()['archived']) // per il pannello delle chat assegnate
      .map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // Funzioni utility comuni
  countAssignedTickets(operatorUid: string): number {
    return this.activeChats.filter((chat) => chat.assignedTo === operatorUid)
      .length;
  }

  findOperatorEmail(uid: string): string {
    const operator = this.operators.find((op) => op.uid === uid);
    return operator ? operator.email : '🕒 In attesa';
  }

  // Toggle singola selezione
  toggleSelection(chatId: string): void {
    if (this.selectedChats.has(chatId)) {
      this.selectedChats.delete(chatId);
    } else {
      this.selectedChats.add(chatId);
    }
  }

  toggleSelectAllChats(event: any): void {
    if (event.target.checked) {
      this.paginatedFilteredActiveChats().forEach((chat) =>
        this.selectedChats.add(chat.id)
      );
    } else {
      this.paginatedFilteredActiveChats().forEach((chat) =>
        this.selectedChats.delete(chat.id)
      );
    }
  }

  areAllChatsSelected(): boolean {
    return this.paginatedFilteredActiveChats().every((chat) =>
      this.selectedChats.has(chat.id)
    );
  }

  // Azioni su chat
  async assignSelectedChats(): Promise<void> {
    console.log(this.selectedOperatorUid);
    if (!this.selectedOperatorUid || this.selectedChats.size === 0) return;

    for (const chatId of this.selectedChats) {
      await updateDoc(doc(this.firestore, 'chats', chatId), {
        assignedTo: this.selectedOperatorUid,
      });
    }

    this.selectedChats.clear();
    this.selectedOperatorUid = '';
    await this.loadChats();
  }

  async archiveChats(): Promise<void> {
    for (const chatId of this.selectedChats) {
      await updateDoc(doc(this.firestore, 'chats', chatId), { archived: true });
    }
    this.selectedChats.clear();
    await this.loadChats();
  }

  async deleteChats(): Promise<void> {
    for (const chatId of this.selectedChats) {
      await updateDoc(doc(this.firestore, 'chats', chatId), { archived: true });
    }
    this.selectedChats.clear();
    await this.loadChats();
  }

  // Paginazione Chat Attive filtrate
  filteredActiveChats(): any[] {
    if (!this.filterOperatorUid) {
      return this.activeChats;
    }
    if (this.filterOperatorUid === 'waiting') {
      return this.activeChats.filter(
        (chat) =>
          chat.assignedTo == null &&
          chat.archived === false &&
          chat.botState === 'operatore'
      );
    }
    return this.activeChats.filter(
      (chat) => chat.assignedTo === this.filterOperatorUid
    );
  }

  paginatedFilteredActiveChats(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredActiveChats().slice(start, start + this.pageSize);
  }

  hasNextPage(): boolean {
    return this.page * this.pageSize < this.filteredActiveChats().length;
  }

  nextPage(): void {
    if (this.hasNextPage()) this.page++;
  }

  previousPage(): void {
    if (this.page > 1) this.page--;
  }

  resetPage(): void {
    this.page = 1;
  }

  // Paginazione Chat da Assegnare
  filteredChatsToAssign(): any[] {
    if (!this.searchTermAssign.trim()) {
      return this.chatsToAssign;
    }
    return this.chatsToAssign.filter((chat) =>
      chat.id.includes(this.searchTermAssign.trim())
    );
  }

  paginatedChatsToAssign(): any[] {
    const start = (this.pageAssign - 1) * this.pageSizeAssign;
    return this.filteredChatsToAssign().slice(
      start,
      start + this.pageSizeAssign
    );
  }

  hasNextPageAssign(): boolean {
    return (
      this.pageAssign * this.pageSizeAssign <
      this.filteredChatsToAssign().length
    );
  }

  nextPageAssign(): void {
    if (this.hasNextPageAssign()) this.pageAssign++;
  }

  previousPageAssign(): void {
    if (this.pageAssign > 1) this.pageAssign--;
  }

  resetPageAssign(): void {
    this.pageAssign = 1;
  }

  drop(event: CdkDragDrop<any>, operatorUid: string) {
    const chat = event.item.data;
    console.log('Drop ricevuto!');
    console.log('Evento:', event);
    console.log('Operatore UID:', operatorUid);

    if (chat) {
      const chatDocRef = doc(this.firestore, `chats/${chat.id}`);
      updateDoc(chatDocRef, { assignedTo: operatorUid })
        .then(() => {
          console.log('Chat assegnata correttamente');
        })
        .catch((error) => {
          console.error("Errore nell'assegnazione:", error);
        });
    }
  }
}

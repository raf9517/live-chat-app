import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';

interface Operator {
  uid: string;
  email: string;
  role: string;
  online: boolean;
}

@Injectable({ providedIn: 'root' })
export class BotService {
  constructor(private firestore: Firestore) {}
  async getBotNode(nodeId: string): Promise<any> {
    const ref = doc(this.firestore, 'botFlow', nodeId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async sendBotMessage(chatId: string, nodeId: string) {
    const node = await this.getBotNode(nodeId);
    if (!node) return;

    // Gestione orari
    let content = node.text;
    let fuoriOrario = false;

    if (node.availableFrom && node.availableTo) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [fromH, fromM] = node.availableFrom.split(':').map(Number);
      const [toH, toM] = node.availableTo.split(':').map(Number);

      const startMinutes = fromH * 60 + fromM;
      const endMinutes = toH * 60 + toM;

      if (startMinutes <= endMinutes) {
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          fuoriOrario = true;
          content = node.unavailableText ?? '❌ Attualmente fuori orario.';
        }
      } else {
        if (currentMinutes > endMinutes && currentMinutes < startMinutes) {
          fuoriOrario = true;
          content = node.unavailableText ?? '❌ Attualmente fuori orario.';
        }
      }
    }

    const msgRef = doc(
      this.firestore,
      `chats/${chatId}/messages`,
      crypto.randomUUID()
    );

    await setDoc(msgRef, {
      senderId: 'bot_fantacalcio',
      content: content, // ✅ Usiamo la variabile corretta
      timestamp: Timestamp.now(),
      options: node.options ?? null,
    });

    // Prepara base updates
    const updates: any = {
      botState: fuoriOrario ? null : nodeId,
      unreadByOperator: true,
      escalatedToHuman: !fuoriOrario ? node.escalate ?? false : false,
    };

    if (nodeId === 'end') {
      updates.archived = true;
    }

    if (!fuoriOrario && node.escalate === true) {
      // 🔥 Qui gestiamo assegnazione dinamica
      const operatorUid = await this.findBestOperator(); // 👈 nuova funzione da chiamare

      if (operatorUid) {
        updates.assignedTo = operatorUid;
        updates.archived = false;
      } else {
        updates.assignedTo = null; // Nessuno online
        console.warn('❌ Nessun operatore disponibile. Chat in attesa.');
      }
    }

    await updateDoc(doc(this.firestore, 'chats', chatId), updates);
  }

  async getNode(id: string): Promise<any> {
    const ref = doc(this.firestore, 'botFlow', id);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async handleFreeInput(chatId: string, userText: string) {
    const chatRef = doc(this.firestore, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    const state = chatSnap.data()?.['botState'];

    const currentNodeRef = doc(this.firestore, 'botFlow', state);
    const currentNodeSnap = await getDoc(currentNodeRef);
    const node = currentNodeSnap.data();

    if (node?.['expectInput'] && node?.['next']) {
      // Risponde in automatico con next
      await this.sendBotMessage(chatId, node['next']);
    }
  }

  async assignTicketToOperator(chatId: string) {
    const operatorsRef = collection(this.firestore, 'operators');
    const onlineQuery = query(operatorsRef, where('online', '==', true));
    const onlineSnap = await getDocs(onlineQuery);

    if (onlineSnap.empty) {
      console.log('❌ Nessun operatore online. Chat in attesa.');
      await updateDoc(doc(this.firestore, 'chats', chatId), {
        assignedTo: null,
        archived: false,
      });
      return;
    }

    const operators: Operator[] = onlineSnap.docs.map((op) => ({
      uid: op.id,
      ...(op.data() as Omit<Operator, 'uid'>),
    }));

    let operatorWithLeastTickets: Operator | null = null;
    let minTickets = Infinity;

    for (const operator of operators) {
      const chatsRef = collection(this.firestore, 'chats');
      const assignedChatsQuery = query(
        chatsRef,
        where('assignedTo', '==', operator.uid),
        where('archived', '==', false)
      );
      const assignedChatsSnap = await getDocs(assignedChatsQuery);

      const numTickets = assignedChatsSnap.size;
      console.log(
        `👤 Operatore ${operator.email} ha ${numTickets} ticket attivi.`
      );

      if (numTickets < minTickets) {
        minTickets = numTickets;
        operatorWithLeastTickets = operator;
      }
    }

    if (operatorWithLeastTickets) {
      console.log('✅ Assegno chat a:', operatorWithLeastTickets.email);
      await updateDoc(doc(this.firestore, 'chats', chatId), {
        assignedTo: operatorWithLeastTickets.uid,
        archived: false,
      });
    }
  }

  async findBestOperator(): Promise<string | null> {
    const operatorsRef = collection(this.firestore, 'operators');
    const onlineQuery = query(operatorsRef, where('online', '==', true));
    const onlineSnap = await getDocs(onlineQuery);

    if (onlineSnap.empty) {
      return null;
    }

    const operators: Operator[] = onlineSnap.docs.map((op) => ({
      uid: op.id,
      ...(op.data() as Omit<Operator, 'uid'>),
    }));

    let operatorWithLeastTickets: Operator | null = null;
    let minTickets = Infinity;

    for (const operator of operators) {
      const chatsRef = collection(this.firestore, 'chats');
      const assignedChatsQuery = query(
        chatsRef,
        where('assignedTo', '==', operator.uid),
        where('archived', '==', false)
      );
      const assignedChatsSnap = await getDocs(assignedChatsQuery);

      const numTickets = assignedChatsSnap.size;
      console.log(
        `👤 Operatore ${operator.email} ha ${numTickets} ticket attivi.`
      );

      if (numTickets < minTickets) {
        minTickets = numTickets;
        operatorWithLeastTickets = operator;
      }
    }

    return operatorWithLeastTickets ? operatorWithLeastTickets.uid : null;
  }
}

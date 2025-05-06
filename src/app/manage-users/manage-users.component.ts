import { Component, OnInit } from '@angular/core';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Firestore,
} from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class ManageUsersComponent implements OnInit {
  users: any[] = [];
  email = '';
  role = 'operator'; // default nuovo utente
  nome = '';
  cognome = '';

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    const snapshot = await getDocs(collection(this.firestore, 'operators'));
    this.users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
  }

  async createUser() {
    if (!this.email.trim()) return;

    const ref = collection(this.firestore, 'operators');
    await addDoc(ref, {
      email: this.email.trim().toLowerCase(),
      role: this.role,
      nome: this.nome,
      cognome: this.cognome,
    });

    this.email = '';
    this.role = 'operator';
    this.nome = '';
    this.cognome = '';

    this.loadUsers();
  }

  async deleteUser(uid: string) {
    const confirmDelete = confirm(
      'Sei sicuro di voler eliminare questo utente?'
    );
    if (!confirmDelete) return;

    await deleteDoc(doc(this.firestore, 'operators', uid));
    this.loadUsers();
  }
}

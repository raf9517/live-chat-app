import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { doc, getDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
@Component({
  selector: 'app-login-operator',
  standalone: true,
  templateUrl: './login-operator.component.html',
  styleUrls: ['./login-operator.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class LoginOperatorComponent {
  email = '';
  password = '';
  error: string | null = null;

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore
  ) {}

  async login() {
    this.error = null;
    try {
      const credential = await signInWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );
      const uid = credential.user.uid;

      // 🔥 Leggi il ruolo da Firestore
      const userRef = doc(this.firestore, 'operators', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('Utente non registrato come operatore');
      }

      const userData = userSnap.data();
      if (userData['role'] !== 'operator') {
        throw new Error('Ruolo non autorizzato');
      }

      console.log('✅ Login Operatore:', userData['email']);

      // ✅ Salva UID localmente
      localStorage.setItem('operatorUid', uid);
      localStorage.setItem('role', userData['role']);
      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = e.message;
    }
  }
}

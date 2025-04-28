import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { user } from 'rxfire/auth';
import { doc, getDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const operatorGuard = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return user(auth).pipe(
    switchMap((currentUser) => {
      if (!currentUser) {
        router.navigate(['/login']);
        return of(false);
      }

      // 🔥 Controlliamo ruolo in Firestore
      const userRef = doc(firestore, 'operators', currentUser.uid);
      return from(getDoc(userRef)).pipe(
        map((snapshot) => {
          const userData = snapshot.data();
          if (userData?.['role'] === 'operator') {
            return true;
          } else {
            router.navigate(['/login']);
            return false;
          }
        })
      );
    })
  );
};

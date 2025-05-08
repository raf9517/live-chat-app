import { inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { doc, getDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

export const adminGuard = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return user(auth).pipe(
    switchMap((currentUser) => {
      if (!currentUser) {
        router.navigate(['/login']);
        return of(false);
      }

      const userRef = doc(firestore, 'operators', currentUser.uid);
      return from(getDoc(userRef)).pipe(
        map((snapshot) => {
          const userData = snapshot.data();
          if (userData?.['role'] === 'admin') {
            return true;
          } else {
            router.navigate(['**']);
            return false;
          }
        })
      );
    })
  );
};

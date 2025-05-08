import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { Operator } from './operator.model';

@Injectable({
  providedIn: 'root',
})
export class OperatorService {
  constructor(private firestore: Firestore) {}

  async loadOperators(): Promise<Operator[]> {
    const snapshot = await getDocs(collection(this.firestore, 'operators'));
    return snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as unknown as Operator[];
  }
}

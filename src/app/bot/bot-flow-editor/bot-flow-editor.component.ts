import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  getDoc,
  DocumentData,
  DocumentReference,
} from '@angular/fire/firestore';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
} from '@angular/forms';
import { BotService } from './bot.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bot-flow-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule],
  templateUrl: './bot-flow-editor.component.html',
  styleUrls: ['./bot-flow-editor.component.scss'],
})
export class BotFlowEditorComponent implements OnInit {
  nodes: any[] = [];
  form!: FormGroup;
  currentNodeId: string | null = null;
  preview: any = null;

  editedNode: any = {}; // il nodo che stai modificando
  newKeyword = '';

  constructor(
    private firestore: Firestore,
    private fb: FormBuilder,
    private botService: BotService
  ) {}

  ngOnInit() {
    this.loadNodes();
    this.createForm();
    this.loadPreview('start');
    //   this.nodes = snap.docs
    // .map((doc: { id: any; data: () => any; }) => ({ id: doc.id, ...doc.data() }))
    // .sort((a: { order: any; }, b: { order: any; }) => (a.order ?? 0) - (b.order ?? 0));
  }

  createForm() {
    this.form = this.fb.group({
      nodeId: ['', Validators.required],
      text: ['', Validators.required],
      escalate: [false],
      options: this.fb.array([]),
      expectInput: [false], // 👈 aggiunto
      next: [''], // usato se expectInput è true
      keywords: this.fb.array([]), // ✅ AGGIUNTO
      availableFrom: [''], // 🔥 aggiunto
      availableTo: [''], // 🔥 aggiunto
      unavailableText: [''], // 🔥 aggiunto
      order: Number,
    });
  }

  get options() {
    return this.form.get('options') as FormArray;
  }

  addOption() {
    this.options.push(
      this.fb.group({
        text: ['', Validators.required],
        next: ['', Validators.required],
      })
    );
  }

  removeOption(index: number) {
    this.options.removeAt(index);
  }

  async save() {
    const value = this.form.value;
    const nodeRef = doc(this.firestore, 'botFlow', value.nodeId);
    await setDoc(nodeRef, {
      text: value.text,
      escalate: value.escalate,
      options: value.options ?? [],
      expectInput: value.expectInput ?? false,
      next: value.next,
      keywords: value.keywords ?? [], // ✅ Salvi anche le keywords
      availableFrom: value.availableFrom ?? '',
      availableTo: value.availableTo ?? '',
      unavailableText: value.unavailableText ?? '',
      order: value.order,
    });
    alert('✅ Nodo salvato!');
    this.loadNodes();
    // this.newNode();
  }

  // async loadNodes() {
  //   const snapshot = await getDocs(collection(this.firestore, 'botFlow'));
  //   this.nodes = snapshot.docs.map((doc) => doc.id).sort();
  // }

  async loadNodes() {
    const snapshot = await getDocs(collection(this.firestore, 'botFlow'));
    this.nodes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        nodeId: doc.id, // id del documento
        name: doc.id, // nome = id (puoi cambiarlo se vuoi in futuro)
        ...data, // tutti gli altri dati (escalate, expectInput, options, etc.)
      }; // 👈 importante: prendo anche i dati
    });
    this.nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async loadNode(nodeId: string) {
    const ref = doc(this.firestore, 'botFlow', nodeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const optionTexts = data['options']?.map((opt: any) => opt.text) ?? [];
    this.form.reset();
    this.keywords.clear();
    (data['keywords'] ?? []).forEach((kw: string) => {
      this.keywords.push(this.fb.control(kw));
    });
    this.options.clear();

    this.form.patchValue({
      nodeId,
      text: data['text'],
      escalate: data['escalate'] ?? false,
      expectInput: data['expectInput'],
      next: data['next'],
      keywords: data['tekeywordsxt'] ?? [], // ✅ Salvi anche le keywords
      availableFrom: data['availableFrom'] ?? '',
      availableTo: data['availableTo'] ?? '',
      unavailableText: data['unavailableText'] ?? '',
      order: data['order'],
    });

    data['options']?.forEach((opt: any) => {
      this.options.push(
        this.fb.group({
          text: [opt.text, Validators.required],
          next: [opt.next],
        })
      );
    });

    this.currentNodeId = nodeId;
  }

  newNode() {
    this.form.reset();
    this.options.clear();
    this.currentNodeId = null;
  }

  async simulateNode() {
    const nodeId = this.form.value.nodeId;
    if (!nodeId) return;
    await this.botService.sendBotMessage('chat_test', nodeId);
    alert('🔄 Nodo simulato nella chat_test');
  }

  async loadPreview(id: string) {
    this.preview = await this.botService.getNode(id);
  }

  async onDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.nodes, event.previousIndex, event.currentIndex);

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      if (!node?.nodeId) {
        console.error(`Nodo senza nodeId alla posizione ${i}`, node);
        continue;
      }

      const ref = doc(this.firestore, 'botFlow', node.nodeId);
      console.log('Aggiorno nodo', node.nodeId, 'con ordine', i);
      await updateDoc(ref, { order: i });
    }
  }

  async deleteNode(nodeId: string) {
    if (!confirm(`Sei sicuro di voler eliminare il nodo "${nodeId}"?`)) {
      return;
    }

    const ref = doc(this.firestore, 'botFlow', nodeId);
    await deleteDoc(ref);
    console.log(`Nodo "${nodeId}" eliminato.`);

    // Ricarica i nodi dopo l'eliminazione
    this.loadNodes();
  }

  get keywords() {
    return this.form.get('keywords') as FormArray;
  }

  addKeyword() {
    if (!this.newKeyword.trim()) return;

    // Dividi per virgole
    const splitted = this.newKeyword.split(',');

    splitted.forEach((word) => {
      const cleanWord = word.trim().toLowerCase();
      if (cleanWord && !this.keywords.value.includes(cleanWord)) {
        this.keywords.push(this.fb.control(cleanWord));
      }
    });

    // Pulisci l'input dopo
    this.newKeyword = '';
  }

  removeKeyword(index: number) {
    this.keywords.removeAt(index);
  }
}

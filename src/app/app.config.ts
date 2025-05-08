import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { OperatorDashboardComponent } from './operator-dashboard/operator-dashboard.component';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { ChatUtenteComponent } from './chat-utente/chat-utente.component';
import { BotFlowEditorComponent } from './bot/bot-flow-editor/bot-flow-editor.component';
import { LoginOperatorComponent } from './login-operator/login-operator.component';
import { operatorGuard } from './auth-guard';
import { ManageUsersComponent } from './manage-users/manage-users.component';
import { adminGuard } from './admin-guard';
import { OperatorManagementComponent } from './operator-management/operator-management.component';
import { OperatorArchiveComponent } from './operator-archive/operator-archive.component';
import { NotFoundComponent } from './not-found/not-found.component';
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideRouter([
      { path: 'login', component: LoginOperatorComponent },
      {
        path: '',
        component: OperatorDashboardComponent,
        canActivate: [operatorGuard],
      },
      {
        path: 'operator',
        component: OperatorManagementComponent,
        canActivate: [operatorGuard],
      },
      {
        path: 'chat/:id',
        component: ChatWindowComponent,
        canActivate: [operatorGuard],
      },
      { path: 'utente', component: ChatUtenteComponent },
      {
        path: 'bot-admin',
        component: BotFlowEditorComponent,
        canActivate: [operatorGuard],
      },
      {
        path: 'admin',
        component: ManageUsersComponent,
        canActivate: [adminGuard],
      },
      {
        path: 'archive',
        component: OperatorArchiveComponent,
        canActivate: [operatorGuard],
      },
      { path: '**', component: NotFoundComponent },
    ]),
  ],
};

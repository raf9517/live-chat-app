import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  isOperator = !location.pathname.includes('utente');
  showSidebar = false;
  activeSection = '';
  showHeader = true;
  isLoginPage = false;
  ischatPage = false;
  showProfileMenu = false;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.activeSection = this.router.url;
    const path = location.pathname;
    this.isOperator = !path.includes('utente');
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Mostra o nascondi header in base all'url
        this.showHeader = !event.urlAfterRedirects.includes('/login');
        this.isLoginPage = event.urlAfterRedirects.includes('/login');
        this.ischatPage = event.urlAfterRedirects.includes('/utente');
      });
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  clickbot(section: string) {
    this.activeSection = section;
    this.router.navigate(['/bot-admin']);
  }
  clicksupport(section: string) {
    this.activeSection = section;
    this.router.navigate(['/']);
  }
  clickoperator(section: string) {
    this.activeSection = section;
    this.router.navigate(['/operator']);
  }
  clicadmin(section: string) {
    this.activeSection = section;
    this.router.navigate(['/admin']);
  }
}

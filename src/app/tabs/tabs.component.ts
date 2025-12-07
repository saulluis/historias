import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router'; 
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
})
export class TabsComponent implements OnInit {

  isMenuOpen: boolean = false;
  pageTitle: string = 'Palenque'; // Título por defecto

  constructor(private router: Router) {
    // Escuchar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // 1. Cerrar menú al navegar
      this.isMenuOpen = false;
      
      // 2. Actualizar el título según la URL
      this.updateTitle(event.url);
    });
  }

  ngOnInit() {
    // Establecer título inicial al cargar
    this.updateTitle(this.router.url);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  // Lógica simple para definir nombres
  updateTitle(url: string) {
    if (url.includes('home')) {
      this.pageTitle = 'Inicio';
    } else if (url.includes('tienda')) {
      this.pageTitle = 'Tienda';
    } else if (url.includes('experiencia')) {
      this.pageTitle = 'Experiencias';
    } else if (url.includes('foro')) {
      this.pageTitle = 'Comunidad';
    } else if (url.includes('visita')) {
      this.pageTitle = 'Visítanos';
    } else {
      this.pageTitle = 'Palenque';
    }
  }
}
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { AuthService, CargaService, SeedService } from './servicios/core';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: 'app.html',
  styleUrls: ['app.css']
})
export class App {
  auth = inject(AuthService);
  carga = inject(CargaService);
  ruta = inject(Router);

  constructor() {
    const seed = inject(SeedService);
    seed.inicializar();

    const router = inject(Router);
    router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) this.carga.mostrar();
      if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) this.carga.ocultar();
    });
  }

  salir() {
    this.auth.cerrar();
    this.ruta.navigateByUrl('/inicio');
  }
}

import { Directive, HostListener, HostBinding } from '@angular/core';

@Directive({
  selector: '[appSombraAlPasar]',
  standalone: true,
})
export class SombraAlPasarDirective {
  @HostBinding('style.transition') transicion = 'box-shadow 150ms ease';
  @HostBinding('style.boxShadow') sombra = '0 2px 4px rgba(0,0,0,0.08)';

  @HostListener('mouseenter')
  entrar() {
    this.sombra = '0 8px 18px rgba(0,0,0,0.15)';
  }

  @HostListener('mouseleave')
  salir() {
    this.sombra = '0 2px 4px rgba(0,0,0,0.08)';
  }
}

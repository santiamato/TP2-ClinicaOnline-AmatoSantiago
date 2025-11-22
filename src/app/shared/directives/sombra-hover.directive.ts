import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appSombraAlPasar]',
  standalone: true,
})
export class SombraAlPasarDirective {
  @HostBinding('style.boxShadow') sombra = '0 2px 6px rgba(0,0,0,0.05)';
  @HostListener('mouseenter') entrar() {
    this.sombra = '0 10px 26px rgba(0,0,0,0.12)';
  }
  @HostListener('mouseleave') salir() {
    this.sombra = '0 2px 6px rgba(0,0,0,0.05)';
  }
}

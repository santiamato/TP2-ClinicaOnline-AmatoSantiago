import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appEscalaAlPasar]',
  standalone: true,
})
export class EscalaAlPasarDirective {
  @HostBinding('style.transform') transformacion = 'translateZ(0)';
  @HostBinding('style.transition') transicion = 'transform 180ms ease';

  @HostListener('mouseenter') entrar() {
    this.transformacion = 'translateZ(0) scale(1.02)';
  }

  @HostListener('mouseleave') salir() {
    this.transformacion = 'translateZ(0) scale(1)';
  }
}

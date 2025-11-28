import { Directive, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[appEscalaAlPasar]',
  standalone: true,
})
export class DestacarAlPasarDirective {
  @HostBinding('style.transition') transicion = 'outline 160ms ease, outline-offset 160ms ease';
  @HostBinding('style.outline') borde = '2px solid transparent';
  @HostBinding('style.outlineOffset') separacion = '0px';

  @HostListener('mouseenter')
  entrar() {
    this.borde = '2px solid rgba(14, 107, 168, 0.7)';
    this.separacion = '4px';
  }

  @HostListener('mouseleave')
  salir() {
    this.borde = '2px solid transparent';
    this.separacion = '0px';
  }
}

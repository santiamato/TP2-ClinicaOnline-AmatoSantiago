import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDeshabilitarSi]',
  standalone: true,
})
export class DeshabilitarSiDirective {
  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  @Input('appDeshabilitarSi') set deshabilitarSi(condicion: boolean) {
    const host = this.el.nativeElement as any;
    if (host && 'disabled' in host) {
      this.renderer.setProperty(host, 'disabled', !!condicion);
    } else {
      if (condicion) this.renderer.setAttribute(this.el.nativeElement, 'aria-disabled', 'true');
      else this.renderer.removeAttribute(this.el.nativeElement, 'aria-disabled');
    }
  }
}

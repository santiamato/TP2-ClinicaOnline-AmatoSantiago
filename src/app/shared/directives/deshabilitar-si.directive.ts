import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appDeshabilitarSi]',
  standalone: true,
})
export class DeshabilitarSiDirective {
  @HostBinding('attr.disabled') disabledAttr: '' | null = null;
  @HostBinding('attr.aria-disabled') ariaDisabled: 'true' | null = null;

  @Input('appDeshabilitarSi')
  set estado(valor: boolean) {
    if (valor) {
      this.disabledAttr = '';
      this.ariaDisabled = 'true';
    } else {
      this.disabledAttr = null;
      this.ariaDisabled = null;
    }
  }
}

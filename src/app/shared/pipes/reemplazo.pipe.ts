 import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reemplazo',
  standalone: true,
})
export class ReemplazoPipe implements PipeTransform {
  transform<T>(valor: T, reemplazo = 'Sin dato'): string {
    if (valor === null || valor === undefined) return reemplazo;
    const texto = String(valor).trim();
    return texto ? texto : reemplazo;
  }
}

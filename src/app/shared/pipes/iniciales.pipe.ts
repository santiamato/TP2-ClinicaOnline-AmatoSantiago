import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'iniciales',
  standalone: true,
})
export class InicialesPipe implements PipeTransform {
  transform(nombre: string | null | undefined, maximo = 2): string {
    if (!nombre) return '';
    const letras = nombre
      .trim()
      .split(/\s+/)
      .map(p => p[0]?.toUpperCase() || '')
      .join('');
    return letras.slice(0, Math.max(1, maximo));
  }
}

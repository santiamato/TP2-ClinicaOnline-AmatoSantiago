import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resumen',
  standalone: true,
})
export class ResumenPipe implements PipeTransform {
  transform(texto: string | null | undefined, largo = 60): string {
    const limpio = (texto || '').trim();
    if (!limpio) return '';
    if (limpio.length <= largo) return limpio;
    return `${limpio.slice(0, Math.max(0, largo - 3)).trimEnd()}...`;
  }
}

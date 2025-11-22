import { Injectable } from '@angular/core';

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export const DIAS_SEMANA: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
export const HORAS_BASE = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export interface DisponibilidadPorEspecialidad {
  especialidad: string;
  dias: Record<DiaSemana, string[]>;
}

type MapaHorarios = Record<string, DisponibilidadPorEspecialidad[]>;

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private clave = 'horariosEspecialistas';

  obtener(especialistaId: string): DisponibilidadPorEspecialidad[] {
    const mapa = this.leer();
    const lista = mapa[especialistaId] || [];
    return lista.map(item => ({
      especialidad: item.especialidad,
      dias: this.normalizarDias(item.dias),
    }));
  }

  guardar(especialistaId: string, disponibilidad: DisponibilidadPorEspecialidad[]) {
    const mapa = this.leer();
    mapa[especialistaId] = disponibilidad.map(item => ({
      especialidad: item.especialidad,
      dias: this.normalizarDias(item.dias),
    }));
    this.escribir(mapa);
  }

  horasParaDia(especialistaId: string, especialidad: string, fechaISO: string): string[] {
    const dia = this.obtenerDiaSemana(fechaISO);
    const disponibilidad = this.obtener(especialistaId).find(d => d.especialidad === especialidad);
    if (!disponibilidad) return [];
    const horas = disponibilidad.dias[dia] || [];
    return horas.slice();
  }

  private normalizarDias(dias?: Record<string, string[]>) {
    const limpio: Record<DiaSemana, string[]> = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: [],
      domingo: [],
    };
    if (!dias) return limpio;
    DIAS_SEMANA.forEach(dia => {
      const valores = dias[dia] || [];
      limpio[dia] = Array.from(new Set(valores)).sort();
    });
    return limpio;
  }

  private obtenerDiaSemana(fechaISO: string): DiaSemana {
    try {
      const fecha = new Date(fechaISO);
      const indice = fecha.getDay(); // 0 domingo
      const mapa: DiaSemana[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      return mapa[indice] || 'lunes';
    } catch {
      return 'lunes';
    }
  }

  private leer(): MapaHorarios {
    try {
      const texto = localStorage.getItem(this.clave);
      if (!texto) return {};
      const data = JSON.parse(texto);
      return typeof data === 'object' && data ? data : {};
    } catch {
      return {};
    }
  }

  private escribir(mapa: MapaHorarios) {
    localStorage.setItem(this.clave, JSON.stringify(mapa));
  }
}

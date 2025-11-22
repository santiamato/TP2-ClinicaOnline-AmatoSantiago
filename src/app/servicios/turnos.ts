import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { Usuario } from './usuarios';

export type EstadoTurno = 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado' | 'realizado';

export interface Turno {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  especialistaId: string;
  especialistaNombre: string;
  especialidad: string;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
  motivoPaciente?: string;
  motivoEspecialista?: string;
  resenaEspecialista?: string;
  encuestaPaciente?: string;
  calificacionPaciente?: string;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private tabla = 'turnos';

  constructor(private supa: SupabaseService) {}

  private mapear(r: any): Turno {
    return {
      id: r.id,
      pacienteId: r.paciente_id,
      pacienteNombre: r.paciente_nombre,
      especialistaId: r.especialista_id,
      especialistaNombre: r.especialista_nombre,
      especialidad: r.especialidad,
      fecha: r.fecha,
      hora: this.normalizarHora(r.hora),
      estado: r.estado,
      motivoPaciente: r.motivo_paciente || '',
      motivoEspecialista: r.motivo_especialista || '',
      resenaEspecialista: r.resena_especialista || '',
      encuestaPaciente: r.encuesta_paciente || '',
      calificacionPaciente: r.calificacion_paciente || '',
    };
  }

  private normalizarHora(valor: any) {
    if (!valor) return '';
    if (typeof valor === 'string') {
      return valor.length >= 5 ? valor.slice(0, 5) : valor;
    }
    try {
      const texto = valor.toString();
      return texto.length >= 5 ? texto.slice(0, 5) : texto;
    } catch {
      return '';
    }
  }

  private limpiar(datos: any) {
    const limpio: any = {};
    Object.keys(datos).forEach(k => {
      const val = datos[k];
      if (val !== undefined) limpio[k] = val;
    });
    return limpio;
  }

  async listarPorPaciente(id: string): Promise<Turno[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('*').eq('paciente_id', id).order('fecha');
    if (error) throw error;
    return (data || []).map(r => this.mapear(r));
  }

  async listarPorEspecialista(id: string): Promise<Turno[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('*').eq('especialista_id', id).order('fecha');
    if (error) throw error;
    return (data || []).map(r => this.mapear(r));
  }

  async crearTurno(datos: { paciente: Usuario; especialista: Usuario; especialidad: string; fecha: string; hora: string }): Promise<Turno> {
    const fila = {
      paciente_id: datos.paciente.id,
      paciente_nombre: `${datos.paciente.nombre} ${datos.paciente.apellido}`.trim(),
      especialista_id: datos.especialista.id,
      especialista_nombre: `${datos.especialista.nombre} ${datos.especialista.apellido}`.trim(),
      especialidad: datos.especialidad,
      fecha: datos.fecha,
      hora: datos.hora,
      estado: 'pendiente' as EstadoTurno,
    };
    const { data, error } = await this.supa.db.from(this.tabla).insert(fila).select('*').single();
    if (error) throw error;
    return this.mapear(data);
  }

  async actualizarTurno(id: string, cambios: Partial<Turno>) {
    const fila = this.limpiar({
      estado: cambios.estado,
      motivo_paciente: cambios.motivoPaciente,
      motivo_especialista: cambios.motivoEspecialista,
      resena_especialista: cambios.resenaEspecialista,
      encuesta_paciente: cambios.encuestaPaciente,
      calificacion_paciente: cambios.calificacionPaciente,
    });
    if (!Object.keys(fila).length) return;
    const { error } = await this.supa.db.from(this.tabla).update(fila).eq('id', id);
    if (error) throw error;
  }

  async listarTodos(): Promise<Turno[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('*').order('fecha');
    if (error) throw error;
    return (data || []).map(r => this.mapear(r));
  }
}

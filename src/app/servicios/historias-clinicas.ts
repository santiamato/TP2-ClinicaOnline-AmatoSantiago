import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export interface HistoriaClinica {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  especialistaId: string;
  especialistaNombre: string;
  fecha: string;
  altura: number;
  peso: number;
  temperatura: number;
  presion: string;
  extra1?: string;
  extra2?: string;
  extra3?: string;
}

@Injectable({ providedIn: 'root' })
export class HistoriasClinicasService {
  private tabla = 'historias_clinicas';

  constructor(private supa: SupabaseService) {}

  private mapear(r: any): HistoriaClinica {
    return {
      id: r.id,
      pacienteId: r.paciente_id,
      pacienteNombre: r.paciente_nombre,
      especialistaId: r.especialista_id,
      especialistaNombre: r.especialista_nombre,
      fecha: r.fecha,
      altura: r.altura,
      peso: r.peso,
      temperatura: r.temperatura,
      presion: r.presion,
      extra1: r.extra1 || null,
      extra2: r.extra2 || null,
      extra3: r.extra3 || null,
    };
  }

  async crear(registro: Omit<HistoriaClinica, 'id'>): Promise<HistoriaClinica> {
    const fila = {
      paciente_id: registro.pacienteId,
      paciente_nombre: registro.pacienteNombre,
      especialista_id: registro.especialistaId,
      especialista_nombre: registro.especialistaNombre,
      fecha: registro.fecha,
      altura: registro.altura,
      peso: registro.peso,
      temperatura: registro.temperatura,
      presion: registro.presion,
      extra1: registro.extra1 || null,
      extra2: registro.extra2 || null,
      extra3: registro.extra3 || null,
    };
    const { data, error } = await this.supa.db.from(this.tabla).insert(fila).select('*').single();
    if (error) throw error;
    return this.mapear(data);
  }

  async listarPorPaciente(pacienteId: string): Promise<HistoriaClinica[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('*').eq('paciente_id', pacienteId).order('fecha', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => this.mapear(r));
  }

  async listarPorEspecialista(especialistaId: string): Promise<HistoriaClinica[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('*').eq('especialista_id', especialistaId).order('fecha', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => this.mapear(r));
  }
}

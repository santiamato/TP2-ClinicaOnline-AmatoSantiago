import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class EspecialidadesService {
  private tabla = 'especialidades';

  constructor(private supa: SupabaseService) {}

  async obtener(): Promise<string[]> {
    const { data, error } = await this.supa.db.from(this.tabla).select('nombre').order('nombre');
    if (error) throw error;
    return (data || []).map((r: any) => r.nombre);
  }

  async agregar(nombre: string): Promise<void> {
    const limpio = nombre.trim();
    if (!limpio) return;
    const { error } = await this.supa.db.from(this.tabla).insert({ nombre: limpio }).select('*');
    if (error && !String(error.message).includes('duplicate')) throw error;
  }
}

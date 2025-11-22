import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { HistoriasClinicasService, HistoriaClinica } from '../../servicios/historias-clinicas';

@Component({
  standalone: true,
  selector: 'app-seccion-pacientes',
  imports: [CommonModule],
  templateUrl: './seccion-pacientes.html',
  styleUrls: ['./seccion-pacientes.css'],
})
export class SeccionPacientes {
  auth = inject(AuthService);
  historiasSrv = inject(HistoriasClinicasService);
  ruta = inject(Router);

  pacientes: { id: string; nombre: string }[] = [];
  historias: HistoriaClinica[] = [];
  seleccionadas: HistoriaClinica[] = [];
  pacienteNombre = '';
  cargando = false;

  constructor() {
    const u = this.auth.actual();
    if (!u || u.rol !== 'especialista') {
      this.ruta.navigateByUrl('/inicio');
      return;
    }
    this.cargar(u.id);
  }

  async cargar(especialistaId: string) {
    this.cargando = true;
    try {
      const lista = await this.historiasSrv.listarPorEspecialista(especialistaId);
      this.historias = lista;
      const mapa = new Map<string, string>();
      lista.forEach(h => {
        if (!mapa.has(h.pacienteId)) mapa.set(h.pacienteId, h.pacienteNombre);
      });
      this.pacientes = Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
    } finally {
      this.cargando = false;
    }
  }

  verHistoria(pacienteId: string) {
    this.seleccionadas = this.historias.filter(h => h.pacienteId === pacienteId);
    const encontrado = this.pacientes.find(p => p.id === pacienteId);
    this.pacienteNombre = encontrado ? encontrado.nombre : '';
  }

  extrasTexto(h: HistoriaClinica) {
    const extras = [h.extra1, h.extra2, h.extra3].filter(Boolean) as string[];
    if (!extras.length) return 'Sin datos extra';
    return extras.join(' | ');
  }
}

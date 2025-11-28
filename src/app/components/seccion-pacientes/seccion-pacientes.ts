import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { HistoriasClinicasService, HistoriaClinica } from '../../servicios/historias-clinicas';
import { TurnosService, Turno } from '../../servicios/turnos';
import { UsuariosService, Paciente } from '../../servicios/usuarios';

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
  turnosSrv = inject(TurnosService);
  usuariosSrv = inject(UsuariosService);
  ruta = inject(Router);

  pacientes: { id: string; nombre: string; imagen: string }[] = [];
  historias: HistoriaClinica[] = [];
  historiasPaciente: HistoriaClinica[] = [];
  turnosPaciente: Turno[] = [];
  turnosRealizados: Turno[] = [];
  pacienteActual: { id: string; nombre: string; imagen: string } | null = null;
  turnoConResena = '';
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
      const [listaHistorias, listaTurnos] = await Promise.all([
        this.historiasSrv.listarPorEspecialista(especialistaId),
        this.turnosSrv.listarPorEspecialista(especialistaId),
      ]);
      this.historias = listaHistorias;
      this.turnosRealizados = listaTurnos.filter(t => t.estado === 'realizado');
      await this.armarPacientes();
    } finally {
      this.cargando = false;
    }
  }

  private async armarPacientes() {
    const ids = Array.from(new Set(this.turnosRealizados.map(t => t.pacienteId)));
    if (!ids.length) {
      this.pacientes = [];
      this.pacienteActual = null;
      this.turnosPaciente = [];
      this.historiasPaciente = [];
      return;
    }

    const todos = await this.usuariosSrv.obtenerTodos();
    const mapaPacientes = new Map(
      todos
        .filter(u => u.rol === 'paciente')
        .map(p => [p.id, p as Paciente])
    );

    this.pacientes = ids.map(id => {
      const paciente = mapaPacientes.get(id);
      const turno = this.turnosRealizados.find(t => t.pacienteId === id);
      const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : turno?.pacienteNombre || 'Paciente';
      const imagen = paciente?.imagen1 || paciente?.imagen2 || 'foto_paciente.webp';
      return { id, nombre, imagen };
    });
  }

  verPaciente(paciente: { id: string; nombre: string; imagen: string }) {
    this.pacienteActual = paciente;
    this.turnoConResena = '';
    this.turnosPaciente = this.turnosRealizados.filter(t => t.pacienteId === paciente.id);
    this.historiasPaciente = this.historias.filter(h => h.pacienteId === paciente.id);
  }

  verResena(turno: Turno) {
    if (!turno.resenaEspecialista) return;
    this.turnoConResena = this.turnoConResena === turno.id ? '' : turno.id;
  }

  extrasTexto(h: HistoriaClinica) {
    const extras = [h.extra1, h.extra2, h.extra3].filter(Boolean) as string[];
    if (!extras.length) return 'Sin datos extra';
    return extras.join(' | ');
  }
}

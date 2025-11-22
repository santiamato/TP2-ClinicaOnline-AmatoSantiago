import { Component, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { TurnosService, Turno } from '../../servicios/turnos';
import { HistoriasClinicasService, HistoriaClinica } from '../../servicios/historias-clinicas';
import { ReemplazoPipe } from '../../shared/pipes/reemplazo.pipe';
import { ResumenPipe } from '../../shared/pipes/resumen.pipe';
import { SombraAlPasarDirective } from '../../shared/directives/sombra-hover.directive';
import { DeshabilitarSiDirective } from '../../shared/directives/deshabilitar-si.directive';

@Component({
  standalone: true,
  selector: 'app-mis-turnos',
  imports: [CommonModule, FormsModule, ReemplazoPipe, ResumenPipe, SombraAlPasarDirective, DeshabilitarSiDirective],
  templateUrl: './mis-turnos.html',
  styleUrls: ['./mis-turnos.css'],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 1 })),
      state('out', style({ opacity: 0.85 })),
      transition('in => out', animate('500ms ease-in')),
      transition('out => in', animate('800ms ease-out'))
    ]),
    trigger('slideInOut', [
      state('in', style({ transform: 'translateX(0) scale(1.08)' })),
      state('out', style({ transform: 'translateX(0) scale(1)' })),
      transition('in => out', animate('120ms ease-in')),
      transition('out => in', animate('320ms ease-out'))
    ])
  ]
})
export class MisTurnos {
  auth = inject(AuthService);
  turnosSrv = inject(TurnosService);
  historiasSrv = inject(HistoriasClinicasService);
  ruta = inject(Router);
  lista: Turno[] = [];
  historias: HistoriaClinica[] = [];
  filtro = '';
  rol: 'paciente' | 'especialista' | null = null;
  cargando = false;
  motivoPaciente: Record<string, string> = {};
  motivoEspecialista: Record<string, string> = {};
  motivoRechazo: Record<string, string> = {};
  encuestaTexto: Record<string, string> = {};
  calificacionTexto: Record<string, string> = {};
  errorPaciente: Record<string, string> = {};
  errorEspecialista: Record<string, string> = {};
  errorRechazo: Record<string, string> = {};
  errorEncuesta: Record<string, string> = {};
  errorCalificacion: Record<string, string> = {};
  resumenTurno: Record<string, string> = {};
  errorResumen: Record<string, string> = {};
  historiaDatos: Record<string, { altura?: number; peso?: number; temperatura?: number; presion?: string; extras: { clave: string; valor: string }[] }> = {};
  errorHistoria: Record<string, string> = {};
  animaciones: Record<string, { fade: 'in' | 'out'; slide: 'in' | 'out' }> = {};

  constructor() {
    const u = this.auth.actual();
    if (!u) {
      this.ruta.navigateByUrl('/login');
      return;
    }
    if (u.rol === 'paciente' || u.rol === 'especialista') {
      this.rol = u.rol;
      this.cargar();
    } else {
      this.ruta.navigateByUrl('/inicio');
    }
  }

  get usuario() {
    return this.auth.actual();
  }

  async cargar() {
    const u = this.auth.actual();
    if (!u || !this.rol) return;
    this.cargando = true;
    try {
      if (this.rol === 'paciente') this.lista = await this.turnosSrv.listarPorPaciente(u.id);
      else this.lista = await this.turnosSrv.listarPorEspecialista(u.id);
      await this.cargarHistorias(u.id);
    } finally {
      this.cargando = false;
    }
  }

  turnosFiltrados() {
    const texto = this.filtro.trim().toLowerCase();
    if (!texto) return this.lista;
    return this.lista.filter(t => this.textoBusqueda(t).includes(texto));
  }

  estadoClase(estado: string) {
    const limpio = (estado || '').toLowerCase().trim();
    return ['estado', limpio].filter(Boolean).join(' ');
  }

  async cancelarPaciente(t: Turno) {
    if (t.estado === 'realizado' || t.estado === 'cancelado') return;
    const motivo = (this.motivoPaciente[t.id] || '').trim();
    if (!motivo) {
      this.errorPaciente[t.id] = 'Ingrese un motivo.';
      return;
    }
    this.errorPaciente[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'cancelado', motivoPaciente: motivo });
    this.motivoPaciente[t.id] = '';
    await this.cargar();
  }

  async cancelarEspecialista(t: Turno) {
    if (t.estado !== 'pendiente') return;
    const motivo = (this.motivoEspecialista[t.id] || '').trim();
    if (!motivo) {
      this.errorEspecialista[t.id] = 'Ingrese un motivo.';
      return;
    }
    this.errorEspecialista[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'cancelado', motivoEspecialista: motivo });
    this.motivoEspecialista[t.id] = '';
    await this.cargar();
  }

  async rechazarTurno(t: Turno) {
    if (t.estado !== 'pendiente') return;
    const motivo = (this.motivoRechazo[t.id] || '').trim();
    if (!motivo) {
      this.errorRechazo[t.id] = 'Ingrese un motivo.';
      return;
    }
    this.errorRechazo[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'rechazado', motivoEspecialista: motivo });
    this.motivoRechazo[t.id] = '';
    await this.cargar();
  }

  async aceptarTurno(t: Turno) {
    if (t.estado !== 'pendiente') return;
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'aceptado' });
    await this.cargar();
  }

  async completarEncuesta(t: Turno) {
    if (t.encuestaPaciente) return;
    const texto = (this.encuestaTexto[t.id] || '').trim();
    if (!texto) {
      this.errorEncuesta[t.id] = 'Ingrese una encuesta.';
      return;
    }
    this.errorEncuesta[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { encuestaPaciente: texto });
    this.encuestaTexto[t.id] = '';
    await this.cargar();
  }

  async calificarAtencion(t: Turno) {
    if (t.calificacionPaciente) return;
    const texto = (this.calificacionTexto[t.id] || '').trim();
    if (!texto) {
      this.errorCalificacion[t.id] = 'Ingrese una calificacion.';
      return;
    }
    this.errorCalificacion[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { calificacionPaciente: texto });
    this.calificacionTexto[t.id] = '';
    await this.cargar();
  }

  async finalizarTurno(t: Turno) {
    if (t.estado !== 'aceptado') return;
    const texto = (this.resumenTurno[t.id] || '').trim();
    if (!texto) {
      this.errorResumen[t.id] = 'Ingrese un resumen.';
      return;
    }
    this.errorResumen[t.id] = '';
    const datos = this.obtenerHistoria(t.id);
    if (!datos.altura || !datos.peso || !datos.temperatura || !datos.presion) {
      this.errorHistoria[t.id] = 'Complete altura, peso, temperatura y presion.';
      return;
    }
    this.errorHistoria[t.id] = '';
    const extrasTexto = (datos.extras || [])
      .filter(e => e.clave.trim() && e.valor.trim())
      .slice(0, 3)
      .map(e => `${e.clave}: ${e.valor}`);
    const [extra1, extra2, extra3] = extrasTexto;
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'realizado', resenaEspecialista: texto });
    await this.historiasSrv.crear({
      pacienteId: t.pacienteId,
      pacienteNombre: t.pacienteNombre,
      especialistaId: t.especialistaId,
      especialistaNombre: t.especialistaNombre,
      fecha: new Date().toISOString(),
      altura: Number(datos.altura),
      peso: Number(datos.peso),
      temperatura: Number(datos.temperatura),
      presion: datos.presion,
      extra1,
      extra2,
      extra3,
    });
    this.resumenTurno[t.id] = '';
    delete this.historiaDatos[t.id];
    await this.cargar();
  }

  puedeCancelarPaciente(t: Turno) {
    return this.rol === 'paciente' && t.estado !== 'realizado' && t.estado !== 'cancelado' && t.estado !== 'rechazado';
  }

  puedeEncuesta(t: Turno) {
    return this.rol === 'paciente' && t.estado === 'realizado' && t.resenaEspecialista && !t.encuestaPaciente;
  }

  puedeCalificar(t: Turno) {
    return this.rol === 'paciente' && t.estado === 'realizado' && !t.calificacionPaciente;
  }

  puedeCancelarEspecialista(t: Turno) {
    return this.rol === 'especialista' && t.estado === 'pendiente';
  }

  puedeAceptar(t: Turno) {
    return this.rol === 'especialista' && t.estado === 'pendiente';
  }

  puedeFinalizar(t: Turno) {
    return this.rol === 'especialista' && t.estado === 'aceptado';
  }

  obtenerHistoria(id: string) {
    if (!this.historiaDatos[id]) {
      this.historiaDatos[id] = {
        extras: [
          { clave: '', valor: '' },
          { clave: '', valor: '' },
          { clave: '', valor: '' },
        ],
      };
    } else if (!this.historiaDatos[id].extras) {
      this.historiaDatos[id].extras = [
        { clave: '', valor: '' },
        { clave: '', valor: '' },
        { clave: '', valor: '' },
      ];
    }
    return this.historiaDatos[id];
  }

  private async cargarHistorias(idUsuario: string) {
    if (this.rol === 'paciente') {
      this.historias = await this.historiasSrv.listarPorPaciente(idUsuario);
    } else if (this.rol === 'especialista') {
      this.historias = await this.historiasSrv.listarPorEspecialista(idUsuario);
    }
  }

  private historiasDeTurno(t: Turno): HistoriaClinica[] {
    return this.historias.filter(h => h.pacienteId === t.pacienteId && h.especialistaId === t.especialistaId);
  }

  private textoBusqueda(t: Turno): string {
    const partes: string[] = [
      t.especialidad,
      t.pacienteNombre,
      t.especialistaNombre,
      t.fecha,
      t.hora,
      t.estado,
      t.motivoPaciente || '',
      t.motivoEspecialista || '',
      t.resenaEspecialista || '',
      t.encuestaPaciente || '',
      t.calificacionPaciente || '',
    ];
    const historias = this.historiasDeTurno(t);
    historias.forEach(h => {
      partes.push(
        `${h.altura}`,
        `${h.peso}`,
        `${h.temperatura}`,
        h.presion || '',
        h.extra1 || '',
        h.extra2 || '',
        h.extra3 || ''
      );
    });
    return partes.join(' ').toLowerCase();
  }

  animacion(id: string) {
    if (!this.animaciones[id]) {
      this.animaciones[id] = { fade: 'out', slide: 'out' };
    }
    return this.animaciones[id];
  }

  alEntrar(id: string) {
    const estados = this.animacion(id);
    estados.fade = 'in';
    estados.slide = 'in';
  }

  alSalir(id: string) {
    const estados = this.animacion(id);
    estados.fade = 'out';
    estados.slide = 'out';
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { HorariosService, HORAS_BASE, DIAS_SEMANA, DiaSemana, DisponibilidadPorEspecialidad } from '../../servicios/horarios';
import { Especialista, Paciente, Usuario } from '../../servicios/usuarios';
import { HistoriasClinicasService, HistoriaClinica } from '../../servicios/historias-clinicas';
import { InicialesPipe } from '../../shared/pipes/iniciales.pipe';
import { ReemplazoPipe } from '../../shared/pipes/reemplazo.pipe';
import { ResumenPipe } from '../../shared/pipes/resumen.pipe';
import { SombraAlPasarDirective } from '../../shared/directives/sombra-hover.directive';
import { EscalaAlPasarDirective } from '../../shared/directives/escala-hover.directive';

type RegistroDias = Record<DiaSemana, string[]>;
type MapaDisponibilidad = Record<string, RegistroDias>;

@Component({
  standalone: true,
  selector: 'app-mi-perfil',
  imports: [CommonModule, InicialesPipe, ReemplazoPipe, ResumenPipe, SombraAlPasarDirective, EscalaAlPasarDirective],
  templateUrl: './mi-perfil.html',
  styleUrls: ['./mi-perfil.css'],
  animations: [
    trigger('rotate', [
      state('normal', style({ transform: 'rotateY(0deg)' })),
      state('rotated', style({ transform: 'rotateY(180deg)' })),
      transition('normal => rotated', animate('400ms ease-in')),
      transition('rotated => normal', animate('400ms ease-out'))
    ])
  ]
})
export class MiPerfil {
  private auth = inject(AuthService);
  private horariosSrv = inject(HorariosService);
  private historiasSrv = inject(HistoriasClinicasService);
  private router = inject(Router);

  usuario = signal<Usuario | null>(null);
  especialistaActual = computed<Especialista | null>(() => {
    const u = this.usuario();
    return u && u.rol === 'especialista' ? (u as Especialista) : null;
  });
  dias = DIAS_SEMANA;
  horas = HORAS_BASE;
  especialidadActiva = signal('');
  disponibilidad = signal<MapaDisponibilidad>({});
  mensaje = signal('');
  historias = signal<HistoriaClinica[]>([]);
  giros: Record<string, 'normal' | 'rotated'> = {};

  constructor() {
    const actual = this.auth.actual();
    if (!actual) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.usuario.set(actual);
    if (actual.rol === 'especialista') {
      this.cargarDisponibilidad(actual as Especialista);
    } else if (actual.rol === 'paciente') {
      this.cargarHistorias(actual.id);
    }
  }

  seleccionarEspecialidad(nombre: string) {
    this.especialidadActiva.set(nombre);
  }

  estaSeleccionado(dia: DiaSemana, hora: string) {
    const especialidad = this.especialidadActiva();
    if (!especialidad) return false;
    const registro = this.disponibilidad()[especialidad];
    if (!registro) return false;
    return (registro[dia] || []).includes(hora);
  }

  toggleHora(dia: DiaSemana, hora: string) {
    const especialidad = this.especialidadActiva();
    if (!especialidad) return;
    const actual = this.disponibilidad();
    const registro = { ...(actual[especialidad] || this.crearDiasVacios()) };
    const set = new Set(registro[dia] || []);
    set.has(hora) ? set.delete(hora) : set.add(hora);
    registro[dia] = Array.from(set).sort();
    this.disponibilidad.set({ ...actual, [especialidad]: registro });
  }

  guardarHorarios() {
    const u = this.usuario();
    if (!u || u.rol !== 'especialista') return;
    const mapa = this.disponibilidad();
    const lista: DisponibilidadPorEspecialidad[] = (u.especialidades || []).map(nombre => ({
      especialidad: nombre,
      dias: this.normalizarDias(mapa[nombre] || this.crearDiasVacios()),
    }));
    this.horariosSrv.guardar(u.id, lista);
    this.mensaje.set('Horarios actualizados');
    setTimeout(() => this.mensaje.set(''), 2500);
  }

  imagenesPerfil(u: Usuario): string[] {
    if (u.rol === 'paciente') {
      const p = u as Paciente;
      return [p.imagen1, p.imagen2].filter(Boolean) as string[];
    }
    const img = (u as any).imagen;
    return img ? [img] : [];
  }

  fotoPrincipal(u: Usuario) {
    const lista = this.imagenesPerfil(u);
    if (lista.length) return lista[0];
    if (u.rol === 'paciente') return 'foto_paciente.webp';
    if (u.rol === 'especialista') return 'foto_especialista.jpg';
    return 'foto_admin.jpg';
  }

  obraSocial(u: Usuario) {
    return u.rol === 'paciente' ? (u as Paciente).obraSocial : '';
  }

  especialidadesTexto(u: Usuario) {
    return u.rol === 'especialista' ? (u as Especialista).especialidades.join(', ') : '';
  }

  extrasTexto(h: HistoriaClinica) {
    const extras = [h.extra1, h.extra2, h.extra3].filter(Boolean) as string[];
    if (!extras.length) return 'Sin datos extra';
    return extras.join(' | ');
  }

  estadoDato(clave: string) {
    if (!this.giros[clave]) this.giros[clave] = 'normal';
    return this.giros[clave];
  }

  girarDato(clave: string) {
    this.giros[clave] = 'rotated';
  }

  restaurarDato(clave: string) {
    this.giros[clave] = 'normal';
  }

  private cargarDisponibilidad(u: Especialista) {
    const guardada = this.horariosSrv.obtener(u.id);
    const mapa: MapaDisponibilidad = {};
    u.especialidades.forEach(nombre => {
      const encontrada = guardada.find(g => g.especialidad === nombre);
      if (encontrada) {
        const registro: RegistroDias = this.crearDiasVacios();
        this.dias.forEach(d => {
          registro[d] = (encontrada.dias[d] || []).slice();
        });
        mapa[nombre] = registro;
      } else {
        mapa[nombre] = this.crearDiasVacios();
      }
    });
    this.disponibilidad.set(mapa);
    this.especialidadActiva.set(u.especialidades[0] || '');
  }

  private crearDiasVacios(): RegistroDias {
    const base: RegistroDias = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: [],
      domingo: [],
    };
    return base;
  }

  private normalizarDias(dias: RegistroDias): RegistroDias {
    const base = this.crearDiasVacios();
    this.dias.forEach(d => (base[d] = (dias[d] || []).slice().sort()));
    return base;
  }

  private async cargarHistorias(pacienteId: string) {
    try {
      const lista = await this.historiasSrv.listarPorPaciente(pacienteId);
      this.historias.set(lista);
    } catch (e) {
      console.error('No se pudo cargar la historia clinica', e);
    }
  }
}

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
import { SombraAlPasarDirective } from '../../shared/directives/sombra-hover.directive';
import { DestacarAlPasarDirective } from '../../shared/directives/escala-hover.directive';
import jsPDF from 'jspdf';

type RegistroDias = Record<DiaSemana, string[]>;
type MapaDisponibilidad = Record<string, RegistroDias>;

@Component({
  standalone: true,
  selector: 'app-mi-perfil',
  imports: [CommonModule, InicialesPipe, ReemplazoPipe, SombraAlPasarDirective, DestacarAlPasarDirective],
  templateUrl: './mi-perfil.html',
  styleUrls: ['./mi-perfil.css'],
  animations: [
    trigger('rotate', [
      state('normal', style({ transform: 'rotateY(0deg)' })),
      state('rotated', style({ transform: 'rotateY(180deg)' })),
      transition('normal => rotated', animate('400ms ease-in')),
      transition('rotated => normal', animate('400ms ease-out'))
    ]),
    trigger('pageSlideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-40px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ]),
    trigger('pageFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
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
  private logoData: string | null = null;
  private cargandoLogo = false;
  private historiasProfesional: HistoriaClinica[] = [];
  private historiasProfesionalCargadas = false;

  constructor() {
    const actual = this.auth.actual();
    if (!actual) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.usuario.set(actual);
    this.cargarLogo();
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

  async descargarHistoriaPaciente() {
    const user = this.usuario();
    if (!user || user.rol !== 'paciente') return;
    const registros = this.historias();
    if (!registros.length) return;
    await this.cargarLogo();
    const pdf = this.crearEncabezadoPdf('Historia clinica del paciente', `${user.nombre} ${user.apellido}`);
    let y = 45;
    pdf.setFontSize(11);
    y = this.escribirLinea(pdf, `DNI: ${user.dni}`, y);
    y = this.escribirLinea(pdf, `Obra social: ${this.obraSocial(user) || 'Sin datos'}`, y);
    y += 4;
    registros.forEach((h, idx) => {
      pdf.setFontSize(12);
      y = this.escribirLinea(pdf, `Atencion ${idx + 1} - ${this.formatearFechaCompleta(h.fecha)}`, y);
      pdf.setFontSize(10);
      y = this.escribirLinea(pdf, `Especialista: ${h.especialistaNombre}`, y);
      y = this.escribirLinea(pdf, `Altura: ${h.altura} cm | Peso: ${h.peso} kg | Temperatura: ${h.temperatura} C | Presion: ${h.presion}`, y);
      const extras = this.extrasTexto(h);
      if (extras) {
        y = this.escribirParrafo(pdf, `Datos extra: ${extras}`, y);
      }
      y += 4;
    });
    pdf.save('historia_clinica.pdf');
  }

  async descargarAtencionesProfesional() {
    const esp = this.especialistaActual();
    if (!esp) return;
    const lista = await this.obtenerHistoriasProfesional(esp.id);
    if (!lista.length) {
      alert('No hay atenciones registradas para este profesional.');
      return;
    }
    await this.cargarLogo();
    const pdf = this.crearEncabezadoPdf('Atenciones del profesional', `${esp.nombre} ${esp.apellido}`);
    let y = 45;
    lista.forEach((h, idx) => {
      pdf.setFontSize(12);
      y = this.escribirLinea(pdf, `Atencion ${idx + 1} - ${this.formatearFechaCompleta(h.fecha)}`, y);
      pdf.setFontSize(10);
      y = this.escribirLinea(pdf, `Paciente: ${h.pacienteNombre}`, y);
      y = this.escribirLinea(pdf, `Altura: ${h.altura} cm | Peso: ${h.peso} kg | Temperatura: ${h.temperatura} C | Presion: ${h.presion}`, y);
      const extras = this.extrasTexto(h);
      if (extras) {
        y = this.escribirParrafo(pdf, `Datos extra: ${extras}`, y);
      }
      y += 4;
    });
    pdf.save('atenciones_profesional.pdf');
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

  private async cargarLogo() {
    if (this.logoData || this.cargandoLogo) return;
    this.cargandoLogo = true;
    try {
      const resp = await fetch('Logo.png');
      if (!resp.ok) return;
      const blob = await resp.blob();
      this.logoData = await this.blobToDataURL(blob);
    } catch (e) {
      console.warn('No se pudo cargar el logo', e);
    } finally {
      this.cargandoLogo = false;
    }
  }

  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private crearEncabezadoPdf(titulo: string, subtitulo: string) {
    const pdf = new jsPDF();
    const ancho = pdf.internal.pageSize.getWidth();
    if (this.logoData) {
      pdf.addImage(this.logoData, 'PNG', 10, 8, 24, 24);
    }
    pdf.setFontSize(18);
    pdf.text('Clinica Santa Ana', ancho / 2, 18, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Fecha de emision: ${this.formatearFechaHoy()}`, ancho - 10, 12, { align: 'right' });
    pdf.setFontSize(14);
    pdf.text(titulo, ancho / 2, 32, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(subtitulo, ancho / 2, 38, { align: 'center' });
    return pdf;
  }

  private escribirLinea(pdf: jsPDF, texto: string, y: number) {
    y = this.verificarSalto(pdf, y);
    pdf.text(texto, 10, y);
    return y + 6;
  }

  private escribirParrafo(pdf: jsPDF, texto: string, y: number) {
    const ancho = pdf.internal.pageSize.getWidth() - 20;
    const lineas = pdf.splitTextToSize(texto, ancho);
    lineas.forEach((linea: string) => {
      y = this.verificarSalto(pdf, y);
      pdf.text(linea, 10, y);
      y += 6;
    });
    return y;
  }

  private verificarSalto(pdf: jsPDF, y: number) {
    const max = pdf.internal.pageSize.getHeight() - 20;
    if (y > max) {
      pdf.addPage();
      return 20;
    }
    return y;
  }

  private formatearFechaCompleta(valor: string) {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return valor;
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  }

  private formatearFechaHoy() {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private async obtenerHistoriasProfesional(id: string) {
    if (this.historiasProfesionalCargadas) return this.historiasProfesional;
    try {
      this.historiasProfesional = await this.historiasSrv.listarPorEspecialista(id);
      this.historiasProfesionalCargadas = true;
    } catch (e) {
      console.error('No se pudo cargar las atenciones del profesional', e);
      this.historiasProfesional = [];
    }
    return this.historiasProfesional;
  }
}

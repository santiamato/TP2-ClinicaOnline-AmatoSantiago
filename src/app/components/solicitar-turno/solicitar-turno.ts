import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { UsuariosService, Usuario } from '../../servicios/usuarios';
import { TurnosService, Turno } from '../../servicios/turnos';
import { HorariosService, HORAS_BASE } from '../../servicios/horarios';

@Component({
  standalone: true,
  selector: 'app-solicitar-turno',
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitar-turno.html',
  styleUrls: ['./solicitar-turno.css']
})
export class SolicitarTurno {
  auth = inject(AuthService);
  usuariosSrv = inject(UsuariosService);
  turnosSrv = inject(TurnosService);
  horariosSrv = inject(HorariosService);
  ruta = inject(Router);

  rol: 'paciente' | 'especialista' | 'administrador' | null = null;
  especialistas: Usuario[] = [];
  pacientes: Usuario[] = [];
  pacienteSeleccionado: Usuario | null = null;
  especialidadSeleccionada = '';
  especialistaSeleccionado: Usuario | null = null;
  diaSeleccionado = '';
  horaSeleccionada = '';
  diasDisponibles: string[] = [];
  turnosEspecialista: Turno[] = [];
  horasBase = HORAS_BASE;
  diasConDisponibilidad: string[] = [];
  horasDisponiblesDia: string[] = [];
  defaultProfesionalImg = '/doctor-human-svgrepo-com.svg';
  defaultEspecialidadImg = '/hospital-svgrepo-com.svg';
  especialidadIconos: Record<string, string> = {
    cardiologia: '/doctor-human-svgrepo-com.svg',
    traumatologia: '/human-social-security-svgrepo-com.svg',
    clinica: '/hospital-svgrepo-com.svg',
    general: '/hospital-svgrepo-com.svg',
    odontologia: '/human-social-security-svgrepo-com.svg',
  };
  mensaje = '';
  error = '';

  constructor() {
    const u = this.auth.actual();
    if (!u) {
      this.ruta.navigateByUrl('/login');
      return;
    }
    this.rol = u.rol;
    if (u.rol === 'especialista') {
      this.ruta.navigateByUrl('/inicio');
      return;
    }
    if (u.rol === 'paciente') this.pacienteSeleccionado = u;
    this.iniciar();
  }

  async iniciar() {
    this.diasDisponibles = this.generarDias();
    const usuarios = await this.usuariosSrv.obtenerTodos();
    this.especialistas = usuarios.filter(u => u.rol === 'especialista');
    this.pacientes = usuarios.filter(u => u.rol === 'paciente');
  }

  generarDias() {
    const lista: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < 15; i++) {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() + i);
      lista.push(dia.toISOString().split('T')[0]);
    }
    return lista;
  }

  especialidadesDelProfesional() {
    if (!this.especialistaSeleccionado) return [] as string[];
    const lista = (this.especialistaSeleccionado as any).especialidades;
    if (Array.isArray(lista)) return lista;
    return [];
  }

  imagenProfesional(esp: Usuario) {
    return (esp as any).imagen || this.defaultProfesionalImg;
  }

  imagenEspecialidad(nombre: string) {
    const clave = nombre.trim().toLowerCase();
    return this.especialidadIconos[clave] || this.defaultEspecialidadImg;
  }

  async seleccionarProfesional(esp: Usuario) {
    if (this.especialistaSeleccionado?.id === esp.id) {
      this.especialistaSeleccionado = null;
      this.especialidadSeleccionada = '';
      this.diaSeleccionado = '';
      this.horaSeleccionada = '';
      this.diasConDisponibilidad = [];
      this.horasDisponiblesDia = [];
      this.turnosEspecialista = [];
      return;
    }
    this.especialistaSeleccionado = esp;
    this.especialidadSeleccionada = '';
    this.diaSeleccionado = '';
    this.horaSeleccionada = '';
    this.diasConDisponibilidad = [];
    this.horasDisponiblesDia = [];
    this.turnosEspecialista = await this.turnosSrv.listarPorEspecialista(esp.id);
    this.actualizarDisponibilidad();
  }

  seleccionarEspecialidad(nombre: string) {
    if (this.especialidadSeleccionada === nombre) {
      this.especialidadSeleccionada = '';
      this.diaSeleccionado = '';
      this.horaSeleccionada = '';
      this.diasConDisponibilidad = [];
      this.horasDisponiblesDia = [];
      return;
    }
    this.especialidadSeleccionada = nombre;
    this.diaSeleccionado = '';
    this.horaSeleccionada = '';
    this.actualizarDisponibilidad();
  }
 
  seleccionarDia(fecha: string) {
    this.diaSeleccionado = fecha;
    this.horaSeleccionada = '';
    this.actualizarHorasDelDia();
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada = hora;
  }

  seleccionarPaciente(p: Usuario | null) {
    if (this.rol !== 'administrador') return;
    this.pacienteSeleccionado = p;
  }

  puedeEnviar() {
    return this.pacienteSeleccionado && this.especialistaSeleccionado && this.especialidadSeleccionada && this.diaSeleccionado && this.horaSeleccionada;
  }

  async solicitar() {
    this.mensaje = '';
    this.error = '';
    const paciente = this.pacienteSeleccionado;
    const especialista = this.especialistaSeleccionado;
    if (!this.puedeEnviar() || !paciente || !especialista) {
      this.error = 'Complete todos los datos.';
      return;
    }
    const existe = this.turnosEspecialista.some(t => t.fecha === this.diaSeleccionado && t.hora === this.horaSeleccionada && t.estado !== 'cancelado' && t.estado !== 'rechazado');
    if (existe) {
      this.error = 'Ese horario ya esta ocupado.';
      return;
    }
    await this.turnosSrv.crearTurno({
      paciente,
      especialista,
      especialidad: this.especialidadSeleccionada,
      fecha: this.diaSeleccionado,
      hora: this.horaSeleccionada,
    });
    this.mensaje = 'Turno creado.';
    this.horaSeleccionada = '';
    this.diaSeleccionado = '';
    this.horasDisponiblesDia = [];
    this.turnosEspecialista = await this.turnosSrv.listarPorEspecialista(especialista.id);
    this.actualizarDisponibilidad();
  }

  private actualizarDisponibilidad() {
    if (!this.especialistaSeleccionado || !this.especialidadSeleccionada) {
      this.diasConDisponibilidad = [];
      this.diaSeleccionado = '';
      this.horaSeleccionada = '';
      this.horasDisponiblesDia = [];
      return;
    }
    this.diasConDisponibilidad = this.diasDisponibles.filter(fecha => this.horasParaDia(fecha).length > 0);
    if (!this.diasConDisponibilidad.includes(this.diaSeleccionado)) {
      this.diaSeleccionado = '';
      this.horaSeleccionada = '';
      this.horasDisponiblesDia = [];
    } else {
      this.actualizarHorasDelDia();
      if (!this.horasDisponiblesDia.includes(this.horaSeleccionada)) this.horaSeleccionada = '';
    }
  }

  private actualizarHorasDelDia() {
    if (!this.diaSeleccionado) {
      this.horasDisponiblesDia = [];
      return;
    }
    this.horasDisponiblesDia = this.horasParaDia(this.diaSeleccionado);
  }

  private horasParaDia(fecha: string) {
    if (!this.especialistaSeleccionado || !this.especialidadSeleccionada) return [] as string[];
    const preferidas = this.horariosSrv.horasParaDia(
      this.especialistaSeleccionado.id,
      this.especialidadSeleccionada,
      fecha
    );
    const base = preferidas.length ? preferidas : this.horasBase;
    return base.filter(hora => !this.estaHorarioOcupado(fecha, hora));
  }

  private estaHorarioOcupado(fecha: string, hora: string) {
    return this.turnosEspecialista.some(
      t => t.fecha === fecha && t.hora === hora && t.estado !== 'cancelado' && t.estado !== 'rechazado'
    );
  }

  formatearSlot(fecha: string, hora: string) {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    return `(${dia}-${mes} ${hora})`;
  }

  formatearDiaCorto(fecha: string) {
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    return `${dia}-${mes}`;
  }
}

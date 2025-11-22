import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/core';
import { TurnosService, Turno } from '../../servicios/turnos';

@Component({
  standalone: true,
  selector: 'app-turnos-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos-admin.html',
  styleUrls: ['./turnos-admin.css']
})
export class TurnosAdmin {
  auth = inject(AuthService);
  turnosSrv = inject(TurnosService);
  ruta = inject(Router);
  lista: Turno[] = [];
  filtro = '';
  motivos: Record<string, string> = {};
  errores: Record<string, string> = {};
  cargando = false;

  constructor() {
    const u = this.auth.actual();
    if (!u || u.rol !== 'administrador') {
      this.ruta.navigateByUrl('/inicio');
      return;
    }
    this.cargar();
  }

  async cargar() {
    this.cargando = true;
    try {
      this.lista = await this.turnosSrv.listarTodos();
    } finally {
      this.cargando = false;
    }
  }

  get turnosFiltrados() {
    const texto = this.filtro.trim().toLowerCase();
    if (!texto) return this.lista;
    return this.lista.filter(t =>
      t.especialidad.toLowerCase().includes(texto) ||
      t.especialistaNombre.toLowerCase().includes(texto)
    );
  }

  estadoClase(estado: string) {
    const limpio = (estado || '').toLowerCase().trim();
    return ['estado', limpio].filter(Boolean).join(' ');
  }

  puedeCancelar(t: Turno) {
    return t.estado === 'pendiente' || t.estado === 'aceptado';
  }

  async cancelar(t: Turno) {
    if (!this.puedeCancelar(t)) return;
    const texto = (this.motivos[t.id] || '').trim();
    if (!texto) {
      this.errores[t.id] = 'Ingrese un motivo.';
      return;
    }
    this.errores[t.id] = '';
    await this.turnosSrv.actualizarTurno(t.id, { estado: 'cancelado', motivoEspecialista: texto });
    this.motivos[t.id] = '';
    await this.cargar();
  }
}


import { Injectable, signal, inject } from '@angular/core';
import { Usuario, UsuariosService } from './usuarios';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private claveSesion = 'sesionActual';
  actual = signal<Usuario | null>(null);
  private supabase = inject(SupabaseService);

  constructor() {
    const guardado = localStorage.getItem(this.claveSesion);
    if (guardado) {
      this.actual.set(JSON.parse(guardado));
    }
  }

  iniciar(usuario: Usuario) {
    localStorage.setItem(this.claveSesion, JSON.stringify(usuario));
    this.actual.set(usuario);
    void this.registrarIngreso(usuario);
  }

  cerrar() {
    localStorage.removeItem(this.claveSesion);
    this.actual.set(null);
  }

  private async registrarIngreso(usuario: Usuario) {
    try {
      const nombre = `${usuario.nombre} ${usuario.apellido}`.trim() || usuario.mail;
      const { error } = await this.supabase.db.from('log_ingresos').insert({
        usuario: nombre,
        rol: usuario.rol,
      });
      if (error) throw error;
    } catch (error) {
      console.error('No se pudo guardar el log de ingreso', error);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class CargaService {
  activa = signal(false);
  mostrar() {
    this.activa.set(true);
  }
  ocultar() {
    this.activa.set(false);
  }
}

@Injectable({ providedIn: 'root' })
export class SeedService {
  constructor(private usuarios: UsuariosService) {}

  async inicializar() {
    try {
      const lista = await this.usuarios.obtenerTodos();
      if (lista.length) return;

      await Promise.all([
        this.usuarios.crearUsuario({
          nombre: 'Ana',
          apellido: 'Admin',
          edad: 35,
          dni: '10000000',
          mail: 'admin@demo.com',
          contrasenia: '123456',
          rol: 'administrador',
        } as any),
        this.usuarios.crearUsuario({
          nombre: 'Elena',
          apellido: 'Especialista',
          edad: 40,
          dni: '20000000',
          mail: 'especialista@demo.com',
          contrasenia: '123456',
          rol: 'especialista',
          aprobado: true,
          verificado: true,
          especialidades: ['Clinica Medica'],
        } as any),
        this.usuarios.crearUsuario({
          nombre: 'Pablo',
          apellido: 'Paciente',
          edad: 28,
          dni: '30000000',
          mail: 'paciente@demo.com',
          contrasenia: '123456',
          rol: 'paciente',
          obraSocial: 'OSDE',
          verificado: true,
        } as any),
      ]);
    } catch {}
  }
}

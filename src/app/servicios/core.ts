import { Injectable, signal } from '@angular/core';
import { Usuario, UsuariosService } from './usuarios';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private claveSesion = 'sesionActual';
  actual = signal<Usuario | null>(null);

  constructor() {
    const guardado = localStorage.getItem(this.claveSesion);
    if (guardado) {
      this.actual.set(JSON.parse(guardado));
    }
  }

  iniciar(usuario: Usuario) {
    localStorage.setItem(this.claveSesion, JSON.stringify(usuario));
    this.actual.set(usuario);
  }

  cerrar() {
    localStorage.removeItem(this.claveSesion);
    this.actual.set(null);
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

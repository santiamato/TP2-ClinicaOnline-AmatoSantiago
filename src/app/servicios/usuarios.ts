import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';

export type Rol = 'paciente' | 'especialista' | 'administrador';

export interface UsuarioBase {
  id: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  mail: string;
  contrasenia: string;
  rol: Rol;
}

export interface Paciente extends UsuarioBase {
  rol: 'paciente';
  obraSocial: string;
  imagen1?: string;
  imagen2?: string;
  verificado: boolean;
}

export interface Especialista extends UsuarioBase {
  rol: 'especialista';
  especialidades: string[];
  aprobado: boolean;
  verificado: boolean;
  imagen?: string;
}

export interface Administrador extends UsuarioBase {
  rol: 'administrador';
  imagen?: string;
}

export type Usuario = Paciente | Especialista | Administrador;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private pacientesTabla = 'pacientes';
  private especialistasTabla = 'especialistas';
  private adminsTabla = 'administradores';

  constructor(private supa: SupabaseService) {}

  private get db() {
    return this.supa.db;
  }

  async obtenerTodos(): Promise<Usuario[]> {
    const [pacientes, especialistas, admins] = await Promise.all([
      this.listarPacientes(),
      this.listarEspecialistas(),
      this.listarAdmins(),
    ]);
    return [...admins, ...especialistas, ...pacientes];
  }

  async buscarPorMail(mail: string): Promise<Usuario | undefined> {
    const [admin, especialista, paciente] = await Promise.all([
      this.buscarAdmin(mail),
      this.buscarEspecialista(mail),
      this.buscarPaciente(mail),
    ]);
    return admin || especialista || paciente;
  }

  async crearUsuario(datos: Omit<Usuario, 'id'>): Promise<Usuario> {
    if (datos.rol === 'paciente') return this.crearPaciente(datos as Paciente);
    if (datos.rol === 'especialista') return this.crearEspecialista(datos as Especialista);
    return this.crearAdmin(datos as Administrador);
  }

  async actualizar(usuario: Usuario): Promise<void> {
    if (usuario.rol === 'paciente') return this.actualizarPaciente(usuario as Paciente);
    if (usuario.rol === 'especialista') return this.actualizarEspecialista(usuario as Especialista);
    return this.actualizarAdmin(usuario as Administrador);
  }

  async eliminar(usuario: Usuario): Promise<void> {
    if (usuario.rol === 'paciente') return this.eliminarPaciente(usuario.id);
    if (usuario.rol === 'especialista') return this.eliminarEspecialista(usuario.id);
    return this.eliminarAdmin(usuario.id);
  }

  async login(mail: string, contrasenia: string): Promise<Usuario | null> {
    const [admin, especialista, paciente] = await Promise.all([
      this.loginAdmin(mail, contrasenia),
      this.loginEspecialista(mail, contrasenia),
      this.loginPaciente(mail, contrasenia),
    ]);
    return admin || especialista || paciente || null;
  }

  // --- Pacientes ---
  private filaAPaciente(r: any): Paciente {
    return {
      id: r.id,
      rol: 'paciente',
      nombre: r.nombre,
      apellido: r.apellido,
      edad: r.edad,
      dni: r.dni,
      mail: r.mail,
      contrasenia: r.contrasenia,
      obraSocial: r.obra_social ?? r.obraSocial ?? '',
      imagen1: r.imagen1,
      imagen2: r.imagen2,
      verificado: r.verificado,
    };
  }

  private pacienteAFila(p: Omit<Paciente, 'id'> | Paciente) {
    return {
      nombre: p.nombre,
      apellido: p.apellido,
      edad: p.edad,
      dni: p.dni,
      mail: p.mail,
      contrasenia: p.contrasenia,
      obra_social: p.obraSocial,
      imagen1: (p as any).imagen1 ?? null,
      imagen2: (p as any).imagen2 ?? null,
      verificado: (p as any).verificado ?? false,
    };
  }

  private async listarPacientes(): Promise<Paciente[]> {
    const { data, error } = await this.db.from(this.pacientesTabla).select('*').order('created_at');
    if (error) throw error;
    return (data || []).map(r => this.filaAPaciente(r));
  }

  private async buscarPaciente(mail: string): Promise<Paciente | undefined> {
    const { data, error } = await this.db.from(this.pacientesTabla).select('*').eq('mail', mail).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.filaAPaciente(data) : undefined;
  }

  private async crearPaciente(datos: Omit<Paciente, 'id'>): Promise<Paciente> {
    const fila = this.pacienteAFila(datos);
    const { data, error } = await this.db.from(this.pacientesTabla).insert(fila).select('*').single();
    if (error) throw error;
    return this.filaAPaciente(data);
  }

  private async actualizarPaciente(paciente: Paciente): Promise<void> {
    const fila = this.pacienteAFila(paciente);
    const { error } = await this.db.from(this.pacientesTabla).update(fila).eq('id', paciente.id);
    if (error) throw error;
  }

  private async eliminarPaciente(id: string): Promise<void> {
    const { error } = await this.db.from(this.pacientesTabla).delete().eq('id', id);
    if (error) throw error;
  }

  private async loginPaciente(mail: string, contrasenia: string): Promise<Paciente | null> {
    const { data: authData, error: authError } = await this.db.auth.signInWithPassword({
      email: mail,
      password: contrasenia,
    });

    if (authError) {
      console.error('Error al iniciar sesion:', authError);
      return null;
    }

    const user = authData?.user;
    if (!user) return null;

    const verificado = !!user.last_sign_in_at;
    const { data, error } = await this.db.from(this.pacientesTabla).select('*').eq('mail', mail).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    const paciente = this.filaAPaciente(data);
    if (paciente.verificado !== verificado) {
      await this.db.from(this.pacientesTabla).update({ verificado }).eq('id', paciente.id);
      paciente.verificado = verificado;
    }

    if (!verificado) return null;
    return paciente;
  }

  // --- Especialistas ---
  private filaAEspecialista(r: any): Especialista {
    return {
      id: r.id,
      rol: 'especialista',
      nombre: r.nombre,
      apellido: r.apellido,
      edad: r.edad,
      dni: r.dni,
      mail: r.mail,
      contrasenia: r.contrasenia,
      verificado: r.verificado,
      aprobado: r.aprobado,
      especialidades: r.especialidades || [],
      imagen: r.imagen,
    };
  }

  private especialistaAFila(e: Omit<Especialista, 'id'> | Especialista) {
    return {
      nombre: (e as any).nombre,
      apellido: (e as any).apellido,
      edad: (e as any).edad,
      dni: (e as any).dni,
      mail: (e as any).mail,
      contrasenia: (e as any).contrasenia,
      verificado: (e as any).verificado ?? false,
      aprobado: (e as any).aprobado ?? false,
      especialidades: (e as any).especialidades || [],
      imagen: (e as any).imagen ?? null,
    };
  }

  private async listarEspecialistas(): Promise<Especialista[]> {
    const { data, error } = await this.db.from(this.especialistasTabla).select('*').order('created_at');
    if (error) throw error;
    return (data || []).map(r => this.filaAEspecialista(r));
  }

  private async buscarEspecialista(mail: string): Promise<Especialista | undefined> {
    const { data, error } = await this.db.from(this.especialistasTabla).select('*').eq('mail', mail).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.filaAEspecialista(data) : undefined;
  }

  private async crearEspecialista(datos: Omit<Especialista, 'id'>): Promise<Especialista> {
    const fila = this.especialistaAFila(datos);
    const { data, error } = await this.db.from(this.especialistasTabla).insert(fila).select('*').single();
    if (error) throw error;
    return this.filaAEspecialista(data);
  }

  private async actualizarEspecialista(esp: Especialista): Promise<void> {
    const fila = this.especialistaAFila(esp);
    const { error } = await this.db.from(this.especialistasTabla).update(fila).eq('id', esp.id);
    if (error) throw error;
  }

  private async eliminarEspecialista(id: string): Promise<void> {
    const { error } = await this.db.from(this.especialistasTabla).delete().eq('id', id);
    if (error) throw error;
  }

  private async loginEspecialista(mail: string, contrasenia: string): Promise<Especialista | null> {
    try {
      const { data: authData, error: authError } = await this.db.auth.signInWithPassword({
        email: mail,
        password: contrasenia,
      });

      if (authError) {
        console.error('Error al iniciar sesion:', authError.message);
        return null;
      }

      const user = authData?.user;
      if (!user) return null;

      const verificado = !!user.last_sign_in_at;
      const { data, error } = await this.db.from(this.especialistasTabla).select('*').eq('mail', mail).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      const especialista = this.filaAEspecialista(data);
      if (especialista.verificado !== verificado) {
        await this.db.from(this.especialistasTabla).update({ verificado }).eq('id', especialista.id);
        especialista.verificado = verificado;
      }

      if (!especialista.verificado) {
        console.warn('Bloqueado por falta de verificacion de correo.');
        return null;
      }
      if (!especialista.aprobado) {
        console.warn('Bloqueado por falta de aprobacion del administrador.');
        return null;
      }

      return especialista;
    } catch (e: any) {
      console.error('Error general en login especialista:', e.message);
      return null;
    }
  }

  // --- Administradores ---
  private filaAAdmin(r: any): Administrador {
    return {
      id: r.id,
      rol: 'administrador',
      nombre: r.nombre,
      apellido: r.apellido,
      edad: r.edad,
      dni: r.dni,
      mail: r.mail,
      contrasenia: r.contrasenia,
      imagen: r.imagen,
    };
  }

  private adminAFila(a: Omit<Administrador, 'id'> | Administrador) {
    return {
      nombre: (a as any).nombre,
      apellido: (a as any).apellido,
      edad: (a as any).edad,
      dni: (a as any).dni,
      mail: (a as any).mail,
      contrasenia: (a as any).contrasenia,
      imagen: (a as any).imagen ?? null,
    };
  }

  private async listarAdmins(): Promise<Administrador[]> {
    const { data, error } = await this.db.from(this.adminsTabla).select('*').order('created_at');
    if (error) throw error;
    return (data || []).map(r => this.filaAAdmin(r));
  }

  private async buscarAdmin(mail: string): Promise<Administrador | undefined> {
    const { data, error } = await this.db.from(this.adminsTabla).select('*').eq('mail', mail).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.filaAAdmin(data) : undefined;
  }

  private async crearAdmin(datos: Omit<Administrador, 'id'>): Promise<Administrador> {
    const fila = this.adminAFila(datos);
    const { data, error } = await this.db.from(this.adminsTabla).insert(fila).select('*').single();
    if (error) throw error;
    return this.filaAAdmin(data);
  }

  private async actualizarAdmin(admin: Administrador): Promise<void> {
    const fila = this.adminAFila(admin);
    const { error } = await this.db.from(this.adminsTabla).update(fila).eq('id', admin.id);
    if (error) throw error;
  }

  private async eliminarAdmin(id: string): Promise<void> {
    const { error } = await this.db.from(this.adminsTabla).delete().eq('id', id);
    if (error) throw error;
  }

  private async loginAdmin(mail: string, contrasenia: string): Promise<Administrador | null> {
    const { data, error } = await this.db
      .from(this.adminsTabla)
      .select('*')
      .eq('mail', mail)
      .eq('contrasenia', contrasenia)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.filaAAdmin(data) : null;
  }
}

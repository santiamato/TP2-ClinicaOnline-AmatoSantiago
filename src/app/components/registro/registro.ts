import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService } from '../../servicios/usuarios';
import { EspecialidadesService } from '../../servicios/especialidades';
import { CargaService } from '../../servicios/core';
import { Usuario } from '../../servicios/usuarios';
import { SupabaseService } from '../../servicios/supabase';

@Component({
  standalone: true,
  selector: 'app-registro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  fb = inject(FormBuilder);
  ruta = inject(Router);
  usuarios = inject(UsuariosService);
  carga = inject(CargaService);
  especialidadesSrv = inject(EspecialidadesService);
  supabase = inject(SupabaseService);

  tipo = signal<'paciente' | 'especialista' | null>(null);
  especialidades = signal<string[]>([]);
  creado = signal<Usuario | null>(null);
  info = '';

  constructor() {
    (async () => {
      try {
        this.especialidades.set(await this.especialidadesSrv.obtener());
      } catch {}
    })();
  }

  formPaciente = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    edad: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    obraSocial: ['', Validators.required],
    mail: ['', [Validators.required, Validators.email]],
    contrasenia: ['', [Validators.required, Validators.minLength(6)]],
    imagen1: [null as File | null, Validators.required],
    imagen2: [null as File | null, Validators.required],
  });

  formEspecialista = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    edad: [25, [Validators.required, Validators.min(0), Validators.max(100)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    mail: ['', [Validators.required, Validators.email]],
    contrasenia: ['', [Validators.required, Validators.minLength(6)]],
    especialidades: [[] as string[]],
    nuevaEspecialidad: [''],
    imagen: [null as File | null, Validators.required],
  }, { validators: [this.validarEspecialidades()] });

  async registrar() {
    this.info = '';
    const tipo = this.tipo();
    this.carga.mostrar();

    try {
      let v: any;
      if (tipo === 'paciente') {
        if (this.formPaciente.invalid) {
          this.formPaciente.markAllAsTouched();
          this.carga.ocultar();
          return;
        }
        v = this.formPaciente.value;
      } else if (tipo === 'especialista') {
        if (this.formEspecialista.invalid) {
          this.formEspecialista.markAllAsTouched();
          this.carga.ocultar();
          return;
        }
        v = this.formEspecialista.value;
      } else {
        this.info = 'Seleccione un tipo de usuario';
        this.carga.ocultar();
        return;
      }

      const existente = await this.usuarios.buscarPorMail(v.mail);
      if (existente) {
        this.info = 'Ya existe un usuario registrado con ese mail.';
        this.carga.ocultar();
        return;
      }

      const { error: authError } = await this.supabase.db.auth.signUp({
        email: v.mail,
        password: v.contrasenia,
      });

      if (authError) {
        console.error('Error Supabase Auth:', authError);
        this.info = authError.message.includes('User already registered')
          ? 'El correo ya esta registrado.'
          : 'Error al registrar el usuario.';
        this.carga.ocultar();
        return;
      }

      const img1 = await this.leerBase64(v.imagen1 || v.imagen);
      const img2 = await this.leerBase64(v.imagen2);

      const datos: any = {
        nombre: v.nombre,
        apellido: v.apellido,
        edad: v.edad,
        dni: v.dni,
        mail: v.mail,
        contrasenia: v.contrasenia,
        rol: tipo,
        verificado: false,
      };

      if (tipo === 'paciente') {
        datos.obraSocial = v.obraSocial;
        datos.imagen1 = img1;
        datos.imagen2 = img2;
      } else {
        const espLista = [...(v.especialidades || [])];
        const nueva = (v.nuevaEspecialidad || '').trim();
        if (nueva) {
          await this.especialidadesSrv.agregar(nueva);
          espLista.push(nueva);
        }
        datos.especialidades = espLista;
        datos.aprobado = false;
        datos.imagen = img1;
      }

      const creado = await this.usuarios.crearUsuario(datos);
      this.creado.set(creado);
    } catch (e: any) {
      console.error('Error registro:', e);
      this.info = 'Error inesperado. Revise los datos.';
    } finally {
      this.carga.ocultar();
    }
  }

  onArchivo(event: Event, campo: 'imagen1' | 'imagen2' | 'imagen') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (this.tipo() === 'paciente') this.formPaciente.patchValue({ [campo]: file } as any);
    else this.formEspecialista.patchValue({ [campo]: file } as any);
  }

  cambiarEspecialidad(nombre: string, marcado: boolean) {
    const actual = this.formEspecialista.value.especialidades || [];
    const nuevo = marcado ? [...actual, nombre] : actual.filter((x: string) => x !== nombre);
    this.formEspecialista.controls.especialidades.setValue(nuevo);
  }

  private validarEspecialidades() {
    return (group: any) => {
      const lista: string[] = group.get('especialidades')?.value || [];
      const nueva: string = (group.get('nuevaEspecialidad')?.value || '').trim();
      const valido = (Array.isArray(lista) && lista.length > 0) || nueva.length > 0;
      return valido ? null : { especialidadRequerida: true };
    };
  }

  private leerBase64(file: File | null): Promise<string | null> {
    if (!file) return Promise.resolve(null);
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => rej(null);
      fr.readAsDataURL(file);
    });
  }
}

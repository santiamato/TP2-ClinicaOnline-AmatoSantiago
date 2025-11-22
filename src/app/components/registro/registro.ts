import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService, Usuario } from '../../servicios/usuarios';
import { EspecialidadesService } from '../../servicios/especialidades';
import { CargaService } from '../../servicios/core';
import { SupabaseService } from '../../servicios/supabase';

declare const grecaptcha: any;

type TipoUsuario = 'paciente' | 'especialista';

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

  tipo = signal<TipoUsuario | null>(null);
  especialidades = signal<string[]>([]);
  creado = signal<Usuario | null>(null);
  captchaToken = signal('');
  captchaError = signal('');
  info = '';

  private siteKey = '6Lcr9wssAAAAAON6j5nIXFl0HWJYJUTqtm_8jsJZ';
  private recaptchaLoader: Promise<void> | null = null;
  private captchaWidgets: Record<TipoUsuario, number | null> = { paciente: null, especialista: null };
  private captchaElements: Record<TipoUsuario, HTMLElement | null> = { paciente: null, especialista: null };
  private captchaOrigen: TipoUsuario | null = null;

  @ViewChild('captchaPaciente') set captchaPacienteRef(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref) {
      this.captchaElements.paciente = ref.nativeElement;
      this.renderCaptcha('paciente');
    }
  }

  @ViewChild('captchaEspecialista') set captchaEspecialistaRef(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref) {
      this.captchaElements.especialista = ref.nativeElement;
      this.renderCaptcha('especialista');
    }
  }

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

  seleccionar(tipo: TipoUsuario) {
    this.tipo.set(tipo);
    this.info = '';
    this.captchaToken.set('');
    this.captchaOrigen = null;
    this.captchaError.set('');
    setTimeout(() => this.renderCaptcha(tipo));
  }

  async registrar() {
    this.info = '';
    this.captchaError.set('');
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

      if (!this.captchaToken() || this.captchaOrigen !== tipo) {
        this.captchaError.set('Complete el captcha para continuar.');
        this.carga.ocultar();
        return;
      }

      const existente = await this.usuarios.buscarPorMail(v.mail);
      if (existente) {
        this.info = 'Ya existe un usuario registrado con ese correo.';
        this.resetCaptcha(tipo);
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
      this.reiniciarFormularios();
      this.resetCaptcha('paciente');
      this.resetCaptcha('especialista');
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

  private reiniciarFormularios() {
    this.formPaciente.reset({
      edad: 18,
      imagen1: null,
      imagen2: null,
    });
    this.formEspecialista.reset({
      edad: 25,
      especialidades: [],
      nuevaEspecialidad: '',
      imagen: null,
    });
    this.captchaToken.set('');
    this.captchaOrigen = null;
  }

  private async renderCaptcha(tipo: TipoUsuario) {
    const el = this.captchaElements[tipo];
    if (!el) return;
    await this.ensureRecaptcha();
    if (this.captchaWidgets[tipo] !== null) {
      grecaptcha.reset(this.captchaWidgets[tipo]!);
    } else {
      this.captchaWidgets[tipo] = grecaptcha.render(el, {
        sitekey: this.siteKey,
        callback: (token: string) => this.onCaptchaSuccess(token, tipo),
        'expired-callback': () => this.onCaptchaExpired(tipo),
      });
    }
  }

  private resetCaptcha(tipo: TipoUsuario) {
    const id = this.captchaWidgets[tipo];
    if (id !== null && (window as any).grecaptcha?.reset) {
      grecaptcha.reset(id);
    }
    if (this.captchaOrigen === tipo) {
      this.captchaToken.set('');
      this.captchaOrigen = null;
    }
  }

  private onCaptchaSuccess(token: string, tipo: TipoUsuario) {
    this.captchaToken.set(token);
    this.captchaOrigen = tipo;
    this.captchaError.set('');
  }

  private onCaptchaExpired(tipo: TipoUsuario) {
    if (this.captchaOrigen === tipo) {
      this.captchaToken.set('');
      this.captchaOrigen = null;
    }
  }

  private ensureRecaptcha(): Promise<void> {
    if ((window as any).grecaptcha?.render) return Promise.resolve();
    if (!this.recaptchaLoader) {
      this.recaptchaLoader = new Promise(resolve => {
        const check = () => {
          if ((window as any).grecaptcha?.render) resolve();
          else setTimeout(check, 200);
        };
        check();
      });
    }
    return this.recaptchaLoader;
  }
}

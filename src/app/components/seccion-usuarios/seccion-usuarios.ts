import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../servicios/usuarios';
import { EspecialidadesService } from '../../servicios/especialidades';
import { Administrador, Especialista, Paciente, Usuario } from '../../servicios/usuarios';
import { SupabaseService } from '../../servicios/supabase';
import { AuthService, CargaService } from '../../servicios/core';
import { HistoriasClinicasService, HistoriaClinica } from '../../servicios/historias-clinicas';
import { utils, writeFile } from 'xlsx';

@Component({
  standalone: true,
  selector: 'app-seccion-usuarios',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './seccion-usuarios.html',
  styleUrls: ['./seccion-usuarios.css'],
})
export class SeccionUsuarios {
  usuariosSrv = inject(UsuariosService);
  especialidadesSrv = inject(EspecialidadesService);
  supabase = inject(SupabaseService);
  carga = inject(CargaService);
  auth = inject(AuthService);
  historiasSrv = inject(HistoriasClinicasService);

  lista = signal<Usuario[]>([]);
  filtro = signal('');
  esAdmin = computed(() => this.auth.actual()?.rol === 'administrador');

  vistos = computed(() => {
    const f = this.filtro().toLowerCase();
    return this.lista().filter(u =>
      `${u.nombre} ${u.apellido} ${u.mail} ${u.rol}`.toLowerCase().includes(f)
    );
  });

  fb = inject(FormBuilder);
  rolNuevo = signal<'paciente'|'especialista'|'administrador'>('paciente');
  especialidades = signal<string[]>([]);
  mensaje = signal('');
  creado = signal<Usuario | null>(null);
  pacienteHistoria = signal<Usuario | null>(null);
  historias = signal<HistoriaClinica[]>([]);

  constructor() {
    (async () => {
      try {
        this.lista.set(await this.usuariosSrv.obtenerTodos());
        this.especialidades.set(await this.especialidadesSrv.obtener());
      } catch {}
    })();
  }

  fPaciente = this.fb.group({
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

  fEspecialista = this.fb.group({
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

  fAdmin = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    edad: [25, [Validators.required, Validators.min(0), Validators.max(100)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    mail: ['', [Validators.required, Validators.email]],
    contrasenia: ['', [Validators.required, Validators.minLength(6)]],
    imagen: [null as File | null, Validators.required]
  });

  async crear() {
    this.mensaje.set('');
    this.creado.set(null);
    const rol = this.rolNuevo();
    let nuevo: Usuario | null = null;
    let usoCarga = false;

    const iniciarCarga = () => {
      if (!usoCarga) {
        usoCarga = true;
        this.carga.mostrar();
      }
    };

    try {
      if (rol === 'paciente') {
        if (this.fPaciente.invalid) { this.fPaciente.markAllAsTouched(); return; }
        iniciarCarga();
        const v = this.fPaciente.value as any;
        if (!(await this.verificarMailDisponible(v.mail))) return;
        if (!(await this.registrarEnAuth(v.mail, v.contrasenia))) return;
        const [i1, i2] = await Promise.all([
          this.leerBase64(v.imagen1),
          this.leerBase64(v.imagen2)
        ]);
        const pDatos = { 
          rol: 'paciente' as const,
          nombre: v.nombre,
          apellido: v.apellido,
          edad: v.edad,
          dni: v.dni,
          obraSocial: v.obraSocial,
          mail: v.mail,
          contrasenia: v.contrasenia,
          imagen1: i1 || undefined,
          imagen2: i2 || undefined,
        };
        nuevo = await this.usuariosSrv.crearUsuario(pDatos as any);

      } else if (rol === 'especialista') {
        if (this.fEspecialista.invalid) { this.fEspecialista.markAllAsTouched(); return; }
        iniciarCarga();
        const v = this.fEspecialista.value as any;
        if (!(await this.verificarMailDisponible(v.mail))) return;
        if (!(await this.registrarEnAuth(v.mail, v.contrasenia))) return;

        const listaE: string[] = [...(v.especialidades || [])];
        const nueva = (v.nuevaEspecialidad || '').trim();
        if (nueva) {
          await this.especialidadesSrv.agregar(nueva);
          listaE.push(nueva);
          this.especialidades.set(await this.especialidadesSrv.obtener());
        }

        const img = await this.leerBase64(v.imagen);
        const eDatos = { 
          rol: 'especialista' as const,
          nombre: v.nombre,
          apellido: v.apellido,
          edad: v.edad,
          dni: v.dni,
          mail: v.mail,
          contrasenia: v.contrasenia,
          especialidades: listaE,
          aprobado: true,
          imagen: img || undefined
        };
        nuevo = await this.usuariosSrv.crearUsuario(eDatos as any);

      } else {
        if (this.fAdmin.invalid) { this.fAdmin.markAllAsTouched(); return; }
        iniciarCarga();
        const v = this.fAdmin.value as any;
        if (!(await this.verificarMailDisponible(v.mail))) return;
        if (!(await this.registrarEnAuth(v.mail, v.contrasenia))) return;
        const img = await this.leerBase64(v.imagen);
        const aDatos = { 
          rol: 'administrador' as const,
          nombre: v.nombre,
          apellido: v.apellido,
          edad: v.edad,
          dni: v.dni,
          mail: v.mail,
          contrasenia: v.contrasenia,
          imagen: img || undefined
        };
        nuevo = await this.usuariosSrv.crearUsuario(aDatos as any);
      }

      if (nuevo) {
        try {
          this.lista.set(await this.usuariosSrv.obtenerTodos());
          this.creado.set(nuevo);
        } catch {}
      }
    } finally {
      if (usoCarga) this.carga.ocultar();
    }
  }

  onArchivo(event: Event, campo: 'imagen1'|'imagen2'|'imagen') {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    const rol = this.rolNuevo();
    if (rol === 'paciente') {
      this.fPaciente.patchValue({ [campo]: file } as any);
      this.fPaciente.get(campo)?.markAsTouched();
    } else if (rol === 'especialista') {
      this.fEspecialista.patchValue({ [campo]: file } as any);
      this.fEspecialista.get(campo)?.markAsTouched();
    } else {
      this.fAdmin.patchValue({ [campo]: file } as any);
      this.fAdmin.get(campo)?.markAsTouched();
    }
  }

  cambiarEspecialidadAdmin(nombre: string, marcado: boolean) {
    const actual = this.fEspecialista.value.especialidades || [];
    const nuevo = marcado
      ? [...actual, nombre]
      : actual.filter((x: string) => x !== nombre);
    this.fEspecialista.controls.especialidades.setValue(nuevo);
    this.fEspecialista.controls.especialidades.markAsTouched();
    this.fEspecialista.updateValueAndValidity();
  }

  async toggleAprobado(u: Usuario) {
    if (u.rol !== 'especialista') return;
    (u as any).aprobado = !(u as any).aprobado;
    await this.usuariosSrv.actualizar(u);
    this.lista.set(await this.usuariosSrv.obtenerTodos());
  }

  async verHistoriaPaciente(u: Usuario) {
    if (u.rol !== 'paciente') {
      this.pacienteHistoria.set(null);
      this.historias.set([]);
      return;
    }
    try {
      this.carga.mostrar();
      const lista = await this.historiasSrv.listarPorPaciente(u.id);
      this.pacienteHistoria.set(u);
      this.historias.set(lista);
      this.mensaje.set('');
    } catch (e) {
      console.error('Error al cargar historia clinica', e);
      this.mensaje.set('No se pudo cargar la historia clinica.');
    } finally {
      this.carga.ocultar();
    }
  }

  extrasTexto(h: HistoriaClinica) {
    const extras = [h.extra1, h.extra2, h.extra3].filter(Boolean) as string[];
    if (!extras.length) return 'Sin datos extra';
    return extras.join(' | ');
  }

  async descargarUsuarios() {
    if (!this.esAdmin()) return;
    try {
      this.carga.mostrar();
      const usuarios = this.lista().length ? this.lista() : await this.usuariosSrv.obtenerTodos();
      const filas = usuarios.map(u => ({
        Rol: u.rol,
        Nombre: u.nombre,
        Apellido: u.apellido,
        Mail: u.mail,
        DNI: u.dni,
        Edad: u.edad,
        'Obra social': u.rol === 'paciente' ? (u as any).obraSocial || '' : '-',
        Especialidades: u.rol === 'especialista' ? ((u as any).especialidades || []).join(' | ') : '-',
        Verificado: (u as any).verificado ? 'Si' : 'No',
        Aprobado: u.rol === 'especialista' ? ((u as any).aprobado ? 'Si' : 'No') : '-'
      }));

      const hoja = utils.json_to_sheet(filas);
      const libro = utils.book_new();
      utils.book_append_sheet(libro, hoja, 'Usuarios');
      writeFile(libro, 'usuarios.xlsx');
    } catch (e) {
      console.error('No se pudo generar el excel de usuarios', e);
      this.mensaje.set('Hubo un problema al generar el excel de usuarios.');
    } finally {
      this.carga.ocultar();
    }
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

  private async verificarMailDisponible(mail: string): Promise<boolean> {
    const existente = await this.usuariosSrv.buscarPorMail(mail);
    if (existente) {
      this.mensaje.set('Ya existe un usuario registrado con ese mail.');
      return false;
    }
    return true;
  }

  private async registrarEnAuth(mail: string, contrasenia: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.db.auth.signUp({ email: mail, password: contrasenia });
      if (error) {
        const mensaje = error.message?.includes('User already registered')
          ? 'El correo ya esta registrado en autenticacion.'
          : 'No se pudo crear el usuario en autenticacion.';
        this.mensaje.set(mensaje);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error registrando en auth:', e);
      this.mensaje.set('Error inesperado al crear las credenciales.');
      return false;
    }
  }
}

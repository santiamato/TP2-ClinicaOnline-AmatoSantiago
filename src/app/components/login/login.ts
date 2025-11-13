import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, CargaService } from '../../servicios/core';
import { UsuariosService } from '../../servicios/usuarios';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  fb = inject(FormBuilder);
  ruta = inject(Router);
  auth = inject(AuthService);
  usuarios = inject(UsuariosService);
  carga = inject(CargaService);

  form = this.fb.group({
    mail: ['', [Validators.required, Validators.email]],
    contrasenia: ['', [Validators.required, Validators.minLength(6)]],
  });

  error = '';

  async acceder() {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { mail, contrasenia } = this.form.value as any;
    this.carga.mostrar();

    setTimeout(async () => {
      const u = await this.usuarios.login(mail, contrasenia);
      if (!u) {
        const existente = await this.usuarios.buscarPorMail(mail);
        if (existente?.rol === 'especialista') {
          if (!existente.verificado) {
            this.error = 'Debes verificar tu cuenta desde el correo enviado';
          } else if (!existente.aprobado) {
            this.error = 'Tu cuenta debe ser aprobada por un administrador';
          } else {
            this.error = 'Credenciales invalidas o usuario no verificado';
          }
        } else {
          this.error = 'Credenciales invalidas o usuario no verificado';
        }
        this.carga.ocultar();
        return;
      }

      if (u.rol === 'especialista') {
        const e = u as any;
        if (!e.aprobado) {
          this.error = 'Tu cuenta debe ser aprobada por un administrador';
          this.carga.ocultar();
          return;
        }
      }

      this.auth.iniciar(u);
      this.carga.ocultar();
      this.ruta.navigateByUrl('/inicio');
    }, 600);
  }

  accesoRapido(tipo: string) {
    const mapa: Record<string, { mail: string; contrasenia: string }> = {
      pac1: { mail: 'paciente@demo.com', contrasenia: '123456' },
      esp1: { mail: 'especialista@demo.com', contrasenia: '123456' },
      admin: { mail: 'admin@demo.com', contrasenia: '123456' },
      pac2: { mail: 'pac2@demo.com', contrasenia: '123456' },
      pac3: { mail: 'pac3@demo.com', contrasenia: '123456' },
      esp2: { mail: 'esp2@demo.com', contrasenia: '123456' },
    };
    const datos = mapa[tipo];
    if (!datos) return;
    this.form.patchValue(datos);
  }
}

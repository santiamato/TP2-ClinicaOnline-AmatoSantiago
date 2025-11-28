import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Registro } from './components/registro/registro';
import { SeccionUsuarios } from './components/seccion-usuarios/seccion-usuarios';
import { MisTurnos } from './components/mis-turnos/mis-turnos';
import { TurnosAdmin } from './components/turnos-admin/turnos-admin';
import { SolicitarTurno } from './components/solicitar-turno/solicitar-turno';
import { MiPerfil } from './components/mi-perfil/mi-perfil';
import { SeccionPacientes } from './components/seccion-pacientes/seccion-pacientes';
import { puedeEntrarAdmin } from './guards/admin.guard';
import { puedeEntrar } from './guards/auth.guard';
import { puedeEntrarEspecialista } from './guards/especialista.guard';
import { Informes } from './components/informes/informes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', component: Home, title: 'Clinica Online - Inicio' },
  { path: 'login', component: Login, title: 'Clinica Online - Ingresar' },
  { path: 'registro', component: Registro, title: 'Clinica Online - Registro' },
  { path: 'mi-perfil', component: MiPerfil, canActivate: [puedeEntrar], title: 'Clinica Online - Mi perfil' },
  { path: 'mis-turnos', component: MisTurnos, canActivate: [puedeEntrar], title: 'Clinica Online - Mis turnos' },
  { path: 'solicitar-turno', component: SolicitarTurno, canActivate: [puedeEntrar], title: 'Clinica Online - Solicitar turno' },
  { path: 'pacientes', component: SeccionPacientes, canActivate: [puedeEntrarEspecialista], title: 'Clinica Online - Pacientes' },
  { path: 'usuarios', component: SeccionUsuarios, canActivate: [puedeEntrarAdmin], title: 'Clinica Online - Usuarios' },
  { path: 'turnos', component: TurnosAdmin, canActivate: [puedeEntrarAdmin], title: 'Clinica Online - Turnos' },
  { path: 'informes', component: Informes, canActivate: [puedeEntrarAdmin], title: 'Clinica Online - Informes' },
  { path: '**', redirectTo: 'inicio' }
];

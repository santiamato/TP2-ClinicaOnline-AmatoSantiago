import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Login } from './components/login/login';
import { Registro } from './components/registro/registro';
import { SeccionUsuarios } from './components/seccion-usuarios/seccion-usuarios';
import { puedeEntrarAdmin } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', component: Home, title: 'Clinica Online - Inicio' },
  { path: 'login', component: Login, title: 'Clinica Online - Ingresar' },
  { path: 'registro', component: Registro, title: 'Clinica Online - Registro' },
  { path: 'usuarios', component: SeccionUsuarios, canActivate: [puedeEntrarAdmin], title: 'Clinica Online - Usuarios' },
  { path: '**', redirectTo: 'inicio' }
];


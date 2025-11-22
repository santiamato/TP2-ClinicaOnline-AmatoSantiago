import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../servicios/core';

export const puedeEntrar = () => {
  const auth = inject(AuthService);
  const ruta = inject(Router);
  if (auth.actual()) return true;
  ruta.navigateByUrl('/login');
  return false;
};


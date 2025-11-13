import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../servicios/core';

export const puedeEntrarAdmin: CanActivateFn = () => {
  const auth = inject(AuthService);
  const u = auth.actual();
  return !!u && u.rol === 'administrador';
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment'; // Asegúrate de que la ruta sea correcta

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken(); 
  const activeTenantId = localStorage.getItem('activeTenantId'); // 1. Buscamos la empresa activa

  // Verificamos si la petición va a nuestro backend principal
  const isMainApi = req.url.startsWith(environment.apiUrl);

  // Si la petición va hacia otro lado (ej: microservicio de WhatsApp), 
  // la dejamos pasar intacta para evitar errores de CORS.
  if (!isMainApi) {
    return next(req);
  }

  let headers = req.headers;

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // 2. Si el usuario seleccionó una empresa, enviamos el header requerido por NestJS
  if (activeTenantId) {
    headers = headers.set('X-Tenant-ID', activeTenantId);
  }

  const clonedReq = req.clone({ headers });
  return next(clonedReq);
};
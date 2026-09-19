import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Inyección moderna de Angular
  private http = inject(HttpClient);
  
  // Ajusta el puerto si tu NestJS corre en otro distinto
  private apiUrl = environment.apiUrl;

  getCurrentEmployee(): any {
    const employeeData = localStorage.getItem('current_employee'); // O como lo llames en tu login
    return employeeData ? JSON.parse(employeeData) : null;
  }

  getWhatsappApiKey(): string {
    const employee = this.getCurrentEmployee();
    
    // Si tiene empresas asignadas, sacamos la llave de la primera (la activa)
    if (employee && employee.employments && employee.employments.length > 0) {
      return employee.employments[0].internalApiKey || '';
    }
    return '';
  }

  // Verifica si la empresa actual tiene WhatsApp habilitado
  hasWhatsappEnabled(): boolean {
    const employee = this.getCurrentEmployee();
    
    if (employee && employee.employments && employee.employments.length > 0) {
      const activeEmployment = employee.employments[0];
      // Puedes validar por el boolean 'wp' o simplemente ver si la llave existe y tiene más de 10 caracteres
      return activeEmployment.wp === true || (!!activeEmployment.internalApiKey && activeEmployment.internalApiKey.length > 10);
    }
    return false;
  }

  login(credentials: { email: string; password: string }) {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        // Asumiendo que el backend devuelve: { access_token: 'ey...', user: { internalApiKey: '...', ... } }
        if (response && response.access_token) {
          localStorage.setItem('auth_token', response.access_token);
          
          // CRÍTICO: Guardamos toda la info del empleado para poder sacar el internalApiKey después
          if (response.user) {
            localStorage.setItem('current_employee', JSON.stringify(response.user));
          }
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_employee'); // Limpiamos todo al salir
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // --- ACTUALIZAR PERFIL ---
  updateProfile(userId: string, data: any) {
    // Apunta al endpoint de tu backend que actualiza el GlobalUser
    return this.http.put(`${this.apiUrl}/global-users/profile/${userId}`, data);
  }

  // --- CAMBIAR CONTRASEÑA ---
  changePassword(data: any) {
    // El payload debe contener { currentPassword, newPassword }
    return this.http.put(`${this.apiUrl}/auth/change-password`, data);
  }
}
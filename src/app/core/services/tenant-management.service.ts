import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TenantManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tenant-management`;

  getMyTenants(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-tenants`);
  }

  createTenant(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateTenant(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  suspendTenant(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  setActiveTenant(tenantId: string, tenantName: string) {
    localStorage.setItem('activeTenantId', tenantId);
    localStorage.setItem('activeTenantName', tenantName);
  }

  getActiveTenantId(): string | null {
    return localStorage.getItem('activeTenantId');
  }

  getActiveTenantName(): string {
    return localStorage.getItem('activeTenantName') || 'Seleccionar Empresa';
  }
}
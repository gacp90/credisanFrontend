import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TenantClientsService {
  private http = inject(HttpClient);
  
  // URL Base: http://localhost:3000/api/v1/tenant-clients
  private apiUrl = `${environment.apiUrl}/tenant-clients`;

  // --- CREATE ---
  // Hace POST a /tenant-clients/enroll
  enrollClient(clientData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/enroll`, clientData);
  }

  // --- READ ALL ---
  // Hace GET a /tenant-clients
  getClients(filters: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters.search) params = params.set('search', filters.search);
    if (filters.limit) params = params.set('limit', filters.limit);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);

    return this.http.get<any>(this.apiUrl, { params });
  }

  // --- READ ONE ---
  // Hace GET a /tenant-clients/:id
  getClientById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // --- UPDATE ---
  // Hace PATCH a /tenant-clients/:id
  updateClient(id: string, updateData: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, updateData);
  }

  // --- DELETE (Desactivar) ---
  // Hace DELETE a /tenant-clients/:id
  deactivateClient(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  importClientsBulk(clientsData: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk`, clientsData);
  }
}
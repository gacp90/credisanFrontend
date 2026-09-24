import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CredisanesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/credisanes`;

  getCredisanes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createCredisan(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateCredisan(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteCredisan(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // --- DETALLE DE SAN ---
  getCredisanById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // --- ASIGNACIONES (PARTICIPANTES) ---
  getAssignments(credisanId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${credisanId}/assignments`);
  }

  addAssignment(credisanId: string, tenantClientId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${credisanId}/assignments`, { tenantClientId });
  }

  removeAssignment(credisanId: string, assignmentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${credisanId}/assignments/${assignmentId}`);
  }

  // --- ACTIVACIÓN ---
  activateSan(credisanId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${credisanId}/activate`, {});
  }

  // --- SORTEO POR RONDA ---
  executeDraw(credisanId: string, payload: { roundNumber: number, preselectedAssignmentId?: string | null }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${credisanId}/draw`, payload);
  }

  // --- PAGOS Y CUOTAS ---
  getInstallmentsByAssignment(assignmentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/installments/assignment/${assignmentId}`);
  }

  getAllInstallmentsByCredisan(credisanId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/installments/credisan/${credisanId}`);
  }

}
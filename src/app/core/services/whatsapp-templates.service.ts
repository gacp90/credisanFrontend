import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service'; // Ajusta la ruta a tu AuthService

@Injectable({ providedIn: 'root' })
export class WhatsappTemplatesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // Inyectamos el servicio global
  private url = environment.wpUrl;

  // Getter privado para construir los headers automáticamente
  private getHeaders(): HttpHeaders {
    const apiKey = this.authService.getWhatsappApiKey();
    return new HttpHeaders({ 'x-api-key': apiKey });
  }

  createTemplate(templateData: any): Observable<any> {
    return this.http.post(`${this.url}/templates/`, templateData, { headers: this.getHeaders() });
  }

  crearPlantillaMedia(formData: any): Observable<any> {
    return this.http.post(`${this.url}/templates/media`, formData, { headers: this.getHeaders() });
  }

  loadTemplates(query: any): Observable<any> {
    return this.http.post(`${this.url}/templates/query`, query, { headers: this.getHeaders() });
  }

  searchTemplates(query: any): Observable<any> {
    return this.http.post(`${this.url}/templates/search`, query, { headers: this.getHeaders() });
  }

  syncTemplates(): Observable<any> {
    return this.http.post(`${this.url}/templates/sync`, {}, { headers: this.getHeaders() });
  }

  toggleTemplateActive(templateId: string, active: boolean): Observable<any> {
    return this.http.patch(`${this.url}/templates/${templateId}/toggle-active`, { active }, { headers: this.getHeaders() });
  }

  validarPlantillaIA(texto: string, archivo?: File) {
    const formData = new FormData();
    formData.append('texto', texto);
    if (archivo) formData.append('file', archivo, archivo.name);
    
    return this.http.post(`${this.url}/templates/validar`, formData, { headers: this.getHeaders() });
  }

  // --- ENVÍO MASIVO DE PLANTILLAS ---
  sendTemplateBulk(payload: any): Observable<any> {
    // Apunta al endpoint exacto que construiste en el microservicio de Rifari
    return this.http.post(`${this.url}/whatsapp/send-template-bulk`, payload, { headers: this.getHeaders() });
  }
}
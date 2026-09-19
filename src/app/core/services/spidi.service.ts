import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SpidiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.wpUrl}/spidi`;

  private getHeaders(): HttpHeaders {
    const apiKey = this.authService.getWhatsappApiKey();
    return new HttpHeaders({ 'x-api-key': apiKey });
  }

  crearCheckout(creditos: number, usuario: string): Observable<any> {    
    const body = {
      creditos: creditos,
      link: window.location.origin + '/dashboard/whatsapp', // Ajusta tu ruta de retorno
      usuario: usuario
    };    

    return this.http.post(`${this.apiUrl}/checkout`, body, { headers: this.getHeaders() });
  }

  obtenerHistorial(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`, { headers: this.getHeaders() });
  }
}
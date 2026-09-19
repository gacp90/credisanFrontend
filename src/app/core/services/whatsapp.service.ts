import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// Este servicio consume a 'rifari-wp', por lo que el interceptor NO le inyectará
// 'Authorization' ni 'X-Tenant-ID', pero SÍ debe llevar el 'x-api-key'.
// Como lo removimos del interceptor, lo agregamos aquí leyendo del AuthService.
import { AuthService } from './auth.service'; 
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private wp_url = environment.wpUrl;

  public channel: any;

  private getHeaders(): HttpHeaders {
    const apiKey = this.authService.getWhatsappApiKey();
    return new HttpHeaders({ 'x-api-key': apiKey });
  }

  checkTokenAndRegister(payloadBackend: any){
    return this.http.post(`${this.wp_url}/whatsapp/exchange-token`, payloadBackend);
  }

  healt(){
    return this.http.get(`${this.wp_url}/whatsapp/health`, { headers: this.getHeaders() })
      .pipe(
        tap( (resp: any) => {
          this.channel = resp.data;
        })
      )
  }
}
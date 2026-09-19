import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentMethodsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payment-methods`;

  getPaymentMethods(includeInactive = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?all=${includeInactive}`);
  }

  createPaymentMethod(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  updatePaymentMethod(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deletePaymentMethod(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  getTransactions(filters: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.paymentMethodId) params = params.set('paymentMethodId', filters.paymentMethodId);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<any[]>(this.apiUrl, { params });
  }

  processTransaction(id: string, action: 'CONFIRM' | 'CANCEL', rejectionReason?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/process`, { action, rejectionReason });
  }

  reportPayment(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/report`, data);
  }
}
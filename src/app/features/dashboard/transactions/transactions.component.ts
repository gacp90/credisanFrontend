import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionsService } from '../../../core/services/transactions.service';
import { PaymentMethodsService } from '../../../core/services/payment-methods.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html'
})
export class TransactionsComponent implements OnInit {
  private transactionsService = inject(TransactionsService);
  private paymentMethodsService = inject(PaymentMethodsService);
  private modalService = inject(NgbModal);

  transactions: any[] = [];
  paymentMethods: any[] = [];
  metrics: any[] = []; // Para los cuadros informativos

  isLoading = true;
  isProcessing = false;

  // Filtros (Por defecto arranca en PENDING)
  filters = {
    status: 'PENDING',
    paymentMethodId: '',
    startDate: '',
    endDate: ''
  };

  // Variables para Modales
  private modalRef!: NgbModalRef;
  selectedTx: any = null;
  rejectionReason: string = '';

  ngOnInit() {
    this.loadPaymentMethods();
    this.loadTransactions();
  }

  loadPaymentMethods() {
    this.paymentMethodsService.getPaymentMethods().subscribe(data => this.paymentMethods = data);
  }

  loadTransactions() {
    this.isLoading = true;
    this.transactionsService.getTransactions(this.filters).subscribe({
      next: (data) => {
        this.transactions = data;
        this.calculateMetrics();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters() {
    this.loadTransactions();
  }

  clearFilters() {
    this.filters = { status: 'PENDING', paymentMethodId: '', startDate: '', endDate: '' };
    this.loadTransactions();
  }

  // --- CUADROS INFORMATIVOS ---
  calculateMetrics() {
    // Agrupamos los montos base (USD) por método de pago y por moneda
    const grouped = this.transactions.reduce((acc, tx) => {
      const methodId = tx.paymentMethodId?._id || 'unknown';
      const methodName = tx.paymentMethodId?.name || 'Desconocido';
      const currency = tx.paymentMethodId?.currency || 'USD';
      
      if (!acc[methodId]) {
        acc[methodId] = { name: methodName, currency, totalBase: 0, totalPaid: 0, count: 0 };
      }
      
      acc[methodId].totalBase += tx.baseAmount; // El equivalente en dólares
      acc[methodId].totalPaid += tx.paidAmount; // Lo que pagaron en físico/transferencia
      acc[methodId].count += 1;
      return acc;
    }, {});

    this.metrics = Object.values(grouped);
  }

  // --- PROCESAR TRANSACCIONES ---
  abrirConfirmar(content: any, tx: any) {
    this.selectedTx = tx;
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  abrirRechazar(content: any, tx: any) {
    this.selectedTx = tx;
    this.rejectionReason = '';
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  confirmarPago() {
    this.isProcessing = true;
    this.transactionsService.processTransaction(this.selectedTx._id, 'CONFIRM').subscribe({
      next: () => {
        this.isProcessing = false;
        this.modalRef.close();
        this.loadTransactions();
      },
      error: (err) => { this.isProcessing = false; alert(err.error?.message); }
    });
  }

  rechazarPago() {
    if (!this.rejectionReason) return;
    this.isProcessing = true;
    this.transactionsService.processTransaction(this.selectedTx._id, 'CANCEL', this.rejectionReason).subscribe({
      next: () => {
        this.isProcessing = false;
        this.modalRef.close();
        this.loadTransactions();
      },
      error: (err) => { this.isProcessing = false; alert(err.error?.message); }
    });
  }
}
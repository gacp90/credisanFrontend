import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaymentMethodsService } from '../../../core/services/payment-methods.service';
import { NgbModal, NgbModalRef, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbDropdownModule],
  templateUrl: './payment-methods.component.html'
})
export class PaymentMethodsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private paymentMethodsService = inject(PaymentMethodsService);
  private modalService = inject(NgbModal);

  paymentMethods: any[] = [];
  isLoading = true;
  isSaving = false;
  
  private modalRef!: NgbModalRef;
  editingMethodId: string | null = null;
  originalExchangeRate: number = 1;

  // Formulario con los detalles extraídos para facilitar el UX
  paymentForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    currency: ['VES', [Validators.required]],
    currentExchangeRate: [1, [Validators.required, Validators.min(0.1)]],
    // Campos para el objeto 'details'
    bank: [''],
    phone: [''],
    documentId: [''],
    email: [''],
    accountNumber: ['']
  });

  get f() { return this.paymentForm.controls; }

  ngOnInit() {
    this.loadPaymentMethods();
  }

  loadPaymentMethods() {
    this.isLoading = true;
    // Solo cargamos los activos por ahora
    this.paymentMethodsService.getPaymentMethods(false).subscribe({
      next: (data) => {
        this.paymentMethods = data;
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  abrirModalNuevo(content: any) {
    this.editingMethodId = null;
    this.paymentForm.reset({ currency: 'VES', currentExchangeRate: 1 });
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  abrirModalEditar(content: any, method: any) {
    this.editingMethodId = method._id;
    this.originalExchangeRate = method.currentExchangeRate;
    
    this.paymentForm.patchValue({
      name: method.name,
      currency: method.currency,
      currentExchangeRate: method.currentExchangeRate,
      // Extraemos los detalles si existen
      bank: method.details?.bank || '',
      phone: method.details?.phone || '',
      documentId: method.details?.documentId || '',
      email: method.details?.email || '',
      accountNumber: method.details?.accountNumber || ''
    });
    
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  guardarMetodo() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.paymentForm.value;

    // 1. Construimos el payload agrupando los detalles
    const payload: any = {
      name: formValue.name,
      currency: formValue.currency,
      currentExchangeRate: formValue.currentExchangeRate,
      details: {}
    };

    // Solo agregamos al details lo que el usuario haya llenado
    if (formValue.bank) payload.details.bank = formValue.bank;
    if (formValue.phone) payload.details.phone = formValue.phone;
    if (formValue.documentId) payload.details.documentId = formValue.documentId;
    if (formValue.email) payload.details.email = formValue.email;
    if (formValue.accountNumber) payload.details.accountNumber = formValue.accountNumber;

    if (this.editingMethodId) {
      // Si la tasa cambió, actualizamos la fecha en el payload
      if (payload.currentExchangeRate !== this.originalExchangeRate) {
        payload.exchangeRateUpdatedAt = new Date();
      }

      this.paymentMethodsService.updatePaymentMethod(this.editingMethodId, payload).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    } else {
      this.paymentMethodsService.createPaymentMethod(payload).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    }
  }

  eliminarMetodo(id: string) {
    if (confirm('¿Desactivar este método de pago? Ya no estará disponible para nuevos cobros.')) {
      this.paymentMethodsService.deletePaymentMethod(id).subscribe({
        next: () => this.loadPaymentMethods(),
        error: (err) => console.error(err)
      });
    }
  }

  private cerrarYRecargar() {
    this.isSaving = false;
    this.modalRef.close();
    this.loadPaymentMethods();
  }

  // Método auxiliar para el ícono según la moneda
  getCurrencyIcon(currency: string): string {
    const icons: any = { 'USD': 'bi-currency-dollar text-success', 'VES': 'bi-cash text-primary', 'COP': 'bi-cash-coin text-warning', 'USDT': 'bi-currency-bitcoin text-warning' };
    return icons[currency] || 'bi-credit-card-fill text-info';
  }
}
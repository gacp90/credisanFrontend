import { Component, EventEmitter, Input, OnChanges, Output, inject, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantClientsService } from '../../../../../core/services/tenant-clients.service';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cliente-form.component.html'
})
export class ClienteFormComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private clientsService = inject(TenantClientsService);

  @Input() clienteData: any = null; // Recibe los datos si es edición
  @Output() onSaved = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  isLoading = false;

  clienteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    cedula: ['', [Validators.required]],
    countryCode: ['+58', [Validators.required]], 
    phoneNumber: ['', [Validators.required]] 
  });

  get f() { return this.clienteForm.controls; }

  // Detecta cuando el padre le pasa un cliente para editar
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteData'] && this.clienteData) {
      const user = this.clienteData.userId; // Datos poblados de GlobalUser
      this.clienteForm.patchValue({
        email: user?.email,
        fullName: user?.fullName,
        cedula: user?.cedula,
        countryCode: user?.countryCode || '58',
        phoneNumber: user?.phoneNumber
      });
      // Opcional: Deshabilitar email y cédula si no quieres que se editen
      this.clienteForm.controls['email'].disable(); 
      this.clienteForm.controls['cedula'].disable();
    } else {
      this.clienteForm.reset({ countryCode: '58' });
      this.clienteForm.enable();
    }
  }

  guardarCliente() {
    if (this.clienteForm.invalid) {
      this.clienteForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.clienteForm.getRawValue(); // getRawValue incluye campos deshabilitados

    if (this.clienteData) {
      // MODO EDICIÓN
      this.clientsService.updateClient(this.clienteData._id, formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.onSaved.emit(response); 
        },
        error: (err) => { this.isLoading = false; console.error(err); }
      });
    } else {
      // MODO CREACIÓN
      this.clientsService.enrollClient(formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.onSaved.emit(response); 
        },
        error: (err) => { this.isLoading = false; console.error(err); }
      });
    }
  }

  cancelar() {
    this.clienteForm.reset({ countryCode: '58' });
    this.onCancel.emit();
  }
}
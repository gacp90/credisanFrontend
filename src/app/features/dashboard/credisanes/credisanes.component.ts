import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CredisanesService } from '../../../core/services/credisanes.service';
import { NgbModal, NgbModalRef, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-credisanes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbDropdownModule, RouterModule],
  templateUrl: './credisanes.component.html'
})
export class CredisanesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private credisanesService = inject(CredisanesService);
  private modalService = inject(NgbModal);

  sanes: any[] = [];
  isLoading = true;
  isSaving = false;
  
  private modalRef!: NgbModalRef;
  editingSanId: string | null = null;

  sanForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(5)]],
    prizeType: ['CASH', [Validators.required]],
    installmentAmount: [50, [Validators.required, Validators.min(1)]],
    totalPositions: [10, [Validators.required, Validators.min(2)]],
    frequency: ['WEEKLY', [Validators.required]],
    graceDays: [0, [Validators.required, Validators.min(0)]],
    startDate: ['', [Validators.required]]
  });

  get f() { return this.sanForm.controls; }

  ngOnInit() {
    this.loadSanes();
  }

  loadSanes() {
    this.isLoading = true;
    this.credisanesService.getCredisanes().subscribe({
      next: (data) => {
        this.sanes = data;
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  abrirModalNueva(content: any) {
    this.editingSanId = null;
    this.sanForm.reset({
      prizeType: 'CASH', installmentAmount: 50, totalPositions: 10,
      frequency: 'WEEKLY', graceDays: 0, startDate: ''
    });
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  abrirModalEditar(content: any, san: any) {
    if (san.status !== 'DRAFT') {
      alert('Solo puedes editar un San que está en Borrador.');
      return;
    }
    
    this.editingSanId = san._id;
    // Formateamos la fecha para el input type="date" (YYYY-MM-DD)
    const formattedDate = san.startDate ? new Date(san.startDate).toISOString().split('T')[0] : '';
    
    this.sanForm.patchValue({
      name: san.name,
      prizeType: san.prizeType,
      installmentAmount: san.installmentAmount,
      totalPositions: san.totalPositions,
      frequency: san.frequency,
      graceDays: san.graceDays,
      startDate: formattedDate
    });
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  guardarSan() {
    if (this.sanForm.invalid) {
      this.sanForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.sanForm.value;

    if (this.editingSanId) {
      this.credisanesService.updateCredisan(this.editingSanId, formData).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    } else {
      this.credisanesService.createCredisan(formData).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    }
  }

  eliminarSan(id: string, status: string) {
    if (status !== 'DRAFT') {
      alert('No puedes eliminar un San activo o completado.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este San?')) {
      this.credisanesService.deleteCredisan(id).subscribe({
        next: () => this.loadSanes(),
        error: (err) => console.error(err)
      });
    }
  }

  private cerrarYRecargar() {
    this.isSaving = false;
    this.modalRef.close();
    this.loadSanes();
  }
}
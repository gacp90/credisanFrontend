import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantManagementService } from '../../../core/services/tenant-management.service';
import { NgbDropdownModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbDropdownModule],
  templateUrl: './empresas.component.html'
})
export class EmpresasComponent implements OnInit {
  private tenantService = inject(TenantManagementService);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal); // Inyectamos ng-bootstrap

  empresas: any[] = [];
  isLoading = true;
  isSaving = false;
  private modalRef!: NgbModalRef; // Guardamos la referencia para cerrarlo

  empresaForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    rif: ['', [Validators.required]],
    address: ['']
  });

  ngOnInit() {
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.isLoading = true;
    this.tenantService.getMyTenants().subscribe({
      next: (data) => {
        this.empresas = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  get f() { return this.empresaForm.controls; }

  // Método para abrir el modal desde el HTML
  abrirModal(content: any) {
    this.empresaForm.reset();
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  editingTenantId: string | null = null;

  // 1. Abrir Modal para Crear
  abrirModalNueva(content: any) {
    this.editingTenantId = null;
    this.empresaForm.reset();
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  // 2. Abrir Modal para Editar
  abrirModalEditar(content: any, empresa: any) {
    this.editingTenantId = empresa._id;
    // Llenamos el formulario con los datos actuales
    this.empresaForm.patchValue({
      name: empresa.name,
      rif: empresa.rif,
      address: empresa.address
    });
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  // 3. Guardar (Detecta si es POST o PATCH)
  guardarEmpresa() {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formData = this.empresaForm.value;

    if (this.editingTenantId) {
      // MODO EDICIÓN
      this.tenantService.updateTenant(this.editingTenantId, formData).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    } else {
      // MODO CREACIÓN
      this.tenantService.createTenant(formData).subscribe({
        next: () => this.cerrarYRecargar(),
        error: (err) => { this.isSaving = false; console.error(err); }
      });
    }
  }

  private cerrarYRecargar() {
    this.isSaving = false;
    this.loadEmpresas();
    this.modalRef.close();
  }

  // 4. Suspender o Reactivar
  cambiarEstado(empresa: any) {
    if (empresa.status === 'ACTIVE') {
      if (confirm(`¿Estás seguro de suspender a ${empresa.name}?`)) {
        this.tenantService.suspendTenant(empresa._id).subscribe({
          next: () => this.loadEmpresas(),
          error: (err) => console.error(err)
        });
      }
    } else {
      if (confirm(`¿Deseas reactivar a ${empresa.name}?`)) {
        // Para reactivar, usamos el PATCH enviando el estado ACTIVE
        this.tenantService.updateTenant(empresa._id, { status: 'ACTIVE' }).subscribe({
          next: () => this.loadEmpresas(),
          error: (err) => console.error(err)
        });
      }
    }
  }
}
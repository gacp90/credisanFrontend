import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LayoutService } from '../../../core/services/layout.service';
import { TenantManagementService } from 'src/app/core/services/tenant-management.service';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {

  private tenantService = inject(TenantManagementService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private layoutService = inject(LayoutService); // Inyectar servicio
  
  empresas: any[] = [];
  activeTenantName: string = 'Cargando...';

  ngOnInit() {
    this.cargarEmpresas();
    this.activeTenantName = this.tenantService.getActiveTenantName();
  }

  isUserMenuOpen = false;

  toggleUserMenu() { this.isUserMenuOpen = !this.isUserMenuOpen; }
  toggleSidebar() { this.layoutService.toggleSidebar(); } // Método para el botón
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  cargarEmpresas() {
    this.tenantService.getMyTenants().subscribe({
      next: (data) => {
        this.empresas = data.filter(emp => emp.status === 'ACTIVE');
        
        // Autoseleccionar la primera empresa si no hay ninguna guardada
        if (this.empresas.length > 0 && !this.tenantService.getActiveTenantId()) {
          this.seleccionarEmpresa(this.empresas[0]);
        }
      }
    });
  }

  seleccionarEmpresa(empresa: any) {
    this.tenantService.setActiveTenant(empresa._id, empresa.name);
    this.activeTenantName = empresa.name;
    // Recargamos la vista para que todos los componentes (como Clientes)
    // disparen sus ngOnInit de nuevo usando el nuevo X-Tenant-ID
    window.location.reload(); 
  }
}
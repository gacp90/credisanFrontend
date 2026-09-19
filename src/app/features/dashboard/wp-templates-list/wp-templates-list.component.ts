import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { WhatsappTemplatesService } from 'src/app/core/services/whatsapp-templates.service';


// import { AuthService } from '../../../../core/services/auth.service'; // Tu servicio de sesión actual

@Component({
  selector: 'app-wp-templates-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './wp-templates-list.component.html'
})
export class WpTemplatesListComponent implements OnInit {
  private templatesService = inject(WhatsappTemplatesService);
  // private authService = inject(AuthService);

  // Reemplaza esto con cómo obtengas el API Key en Credisanes
  public internalApiKey: string = 'AQUI_TU_API_KEY_DEL_TENANT'; 
  
  public templates: any[] = [];
  public total: number = 0;
  public cargandoLista: boolean = false;
  public sincronizando: boolean = false;
  public autoSyncRealizado: boolean = false;
  
  public plantillaSeleccionada: any = null;
  public mostrarModalPreview: boolean = false;

  public query: any = {
    desde: 0,
    hasta: 50,
    active: true,
    sort: { createdAt: -1 }
  };

  ngOnInit(): void { 
    this.loadTemplates();
  }

  loadTemplates() {
    this.cargandoLista = true;
    this.templatesService.loadTemplates(this.query).subscribe({
      next: (res: any) => {
        this.templates = res.templates;
        this.total = res.total;
        this.cargandoLista = false;

        const hayPendientes = this.templates.some(p => p.status === 'PENDING');
        if (hayPendientes && !this.autoSyncRealizado) {
          this.autoSyncRealizado = true; 
          this.sincronizarConMeta(true);
        }
      },
      error: (err) => {
        console.error('Error al cargar templates:', err);
        this.cargandoLista = false;
      }
    });
  }

  sincronizarConMeta(silencioso: boolean = false) {
    this.sincronizando = true;
    this.templatesService.syncTemplates().subscribe({
      next: () => {
        this.sincronizando = false;
        if (!silencioso) {
          Swal.fire({
            icon: 'success', title: 'Sincronización completada',
            text: 'Se han actualizado los estados desde Meta.',
            timer: 2000, showConfirmButton: false
          });
        }
        this.autoSyncRealizado = true; 
        this.loadTemplates(); 
      },
      error: (err) => {
        console.error('Error sincronizando', err);
        this.sincronizando = false;
        if (!silencioso) Swal.fire('Error', 'No se pudo sincronizar con Meta en este momento.', 'error');
      }
    });
  }

  toggleActiva(plantilla: any) {
    const estadoAnterior = !plantilla.active; 
    this.templatesService.toggleTemplateActive(plantilla._id, plantilla.active).subscribe({
      next: () => {
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })
          .fire({ icon: 'success', title: `Plantilla ${plantilla.active ? 'activada' : 'desactivada'}` });
      },
      error: (err) => {
        console.error('Error al cambiar estado', err);
        Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
        plantilla.active = estadoAnterior;
      }
    });
  }

  abrirVistaPrevia(plantilla: any) {
    this.plantillaSeleccionada = plantilla;
    this.mostrarModalPreview = true;
  }

  cerrarVistaPrevia() {
    this.mostrarModalPreview = false;
    this.plantillaSeleccionada = null;
  }

  limiteChange(cantidad: string) {  
    this.query.hasta = Number(cantidad);    
    this.loadTemplates();
  }

  statusChange(orden: string) {  
    this.query.active = (orden === 'Activos');
    this.loadTemplates();
  }
}
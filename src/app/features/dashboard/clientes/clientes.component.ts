import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantClientsService } from '../../../core/services/tenant-clients.service';
import { ClienteFormComponent } from './components/cliente-form/cliente-form.component';
import { NgbModal, NgbModalRef, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { WhatsappTemplatesService } from 'src/app/core/services/whatsapp-templates.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ClienteFormComponent, NgbDropdownModule, FormsModule], 
  templateUrl: './clientes.component.html'
})
export class ClientesComponent implements OnInit {
  private clientsService = inject(TenantClientsService);
  private modalService = inject(NgbModal);
  private templatesService = inject(WhatsappTemplatesService);
  
  clients: any[] = [];
  isLoading = true;
  private modalRef!: NgbModalRef;
  
  // Variable para enviar al hijo
  clienteSeleccionado: any = null; 
  totalItems = 0;
  filters = {
    search: '',
    sortBy: 'newest',
    limit: 10,
    page: 1
  };

  searchSubject = new Subject<string>();

  ngOnInit() {
    this.loadClients();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1; // Volver a la página 1 al buscar
      this.loadClients();
    });
  }

  loadClients() {
    this.isLoading = true;
    this.clientsService.getClients(this.filters).subscribe({
      next: (response) => {
        // Adaptamos a la nueva estructura del backend { items: [], total: number }
        this.clients = response.items;
        this.totalItems = response.total;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  onSearchChange(event: any) {
    this.searchSubject.next(event.target.value);
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadClients();
  }

  cambiarPagina(direccion: number) {
    this.filters.page += direccion;
    this.loadClients();
  }

  abrirModalNueva(content: any) {
    this.clienteSeleccionado = null; // Limpia el formulario
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  abrirModalEditar(content: any, client: any) {
    this.clienteSeleccionado = client; // Pasa los datos al formulario
    this.modalRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  cambiarEstado(client: any) {
    const nuevoEstado = !client.isActive;
    const accion = nuevoEstado ? 'reactivar' : 'desactivar';
    
    if (confirm(`¿Estás seguro de ${accion} a ${client.userId?.fullName}?`)) {
      this.clientsService.updateClient(client._id, { isActive: nuevoEstado }).subscribe({
        next: () => this.loadClients(),
        error: (err) => console.error(err)
      });
    }
  }

  // Se ejecutan cuando el hijo emite los eventos
  handleFormSaved() {
    this.modalRef.close();
    this.loadClients();
  }

  handleFormCanceled() {
    this.modalRef.close();
  }


  // --- VARIABLES PARA EL ENVÍO MASIVO ---
  private modalRefW!: NgbModalRef;
  wpTemplates: any[] = [];
  isLoadingTemplates = false;
  isSending = false;
  templateSelectedApi: any = null;

  // 1. Abrir Modal y Cargar Plantillas Aprobadas
  abrirModalEnvioMasivo(content: any) {
    if (this.clients.length === 0) {
      Swal.fire('Lista vacía', 'No hay clientes en la tabla para enviar mensajes.', 'warning');
      return;
    }

    this.templateSelectedApi = null;
    this.modalRefW = this.modalService.open(content, { centered: true, size: 'lg', backdrop: 'static', windowClass: 'dark-modal' });
    
    // Si ya las cargamos, no las volvemos a pedir al backend
    if (this.wpTemplates.length === 0) {
      this.cargarPlantillasApi();
    }
  }

  cargarPlantillasApi() {
    this.isLoadingTemplates = true;
    const query = {
      desde: 0,
      hasta: 100, // Traemos máximo 100 para no saturar
      active: true,
      status: 'APPROVED' // Solo plantillas permitidas por Meta
    };

    this.templatesService.loadTemplates(query).subscribe({
      next: (res) => {
        this.wpTemplates = res.templates || [];
        this.isLoadingTemplates = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingTemplates = false;
        Swal.fire('Error', 'No se pudieron cargar las plantillas desde Meta.', 'error');
      }
    });
  }

  // 2. Iniciar la Inyección Masiva
  async iniciarEnvioMasivo() {
    if (!this.templateSelectedApi) return;

    // --- VALIDACIÓN DE CONTEXTO ---
    // En el módulo general de clientes, usualmente solo tenemos su Nombre y su Teléfono
    const variablesSoportadasAqui = ['name']; 
    const mapeoPlantilla = this.templateSelectedApi.bodyVariablesMapping || [];
    const variablesFaltantes = mapeoPlantilla.filter((v: string) => !variablesSoportadasAqui.includes(v));

    if (variablesFaltantes.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Plantilla no compatible',
        html: `Esta plantilla requiere datos <b>(${variablesFaltantes.join(', ')})</b> que no están en esta pantalla general.<br><br>Úsala desde el San específico para tener todos los datos.`,
        confirmButtonColor: '#f39c12'
      });
      return;
    }

    this.isSending = true;

    // --- CONSTRUCCIÓN DEL PAYLOAD ---
    const customersPayload = this.clients.map(cliente => {
      // Ajusta esto dependiendo de cómo guardes el teléfono y nombre en tu Base de Datos de TenantClients
      // Ej: cliente.userId?.phoneNumber, cliente.userId?.fullName
      const codigo = cliente.userId?.countryCode || '';
      const numero = cliente.userId?.phoneNumber || cliente.telefono || ''; 
      const name = cliente.userId?.fullName || cliente.nombre || '';

      const phone = (codigo + numero).replace(/[\s\-\(\)\+]/g, ''); 
      
      const parametrosDinamicos = mapeoPlantilla.map((variable: string) => {
        if (variable === 'name') return name;
        return ''; 
      }); 

      return { phone: phone, customerName: name, parameters: parametrosDinamicos };
    }).filter(c => c.phone.length >= 10); // Evitamos números vacíos o inválidos

    if (customersPayload.length === 0) {
      this.isSending = false;
      Swal.fire('Error', 'Ningún cliente listado posee un número de teléfono válido.', 'error');
      return;
    }

    const payload = {
      templateid: this.templateSelectedApi._id,
      templateName: this.templateSelectedApi.name,
      langCode: this.templateSelectedApi.language,
      customers: customersPayload
    };
    
    // --- ENVÍO AL MICROSERVICIO ---
    this.templatesService.sendTemplateBulk(payload).subscribe({
      next: () => {
        this.isSending = false;
        this.modalRefW.close();
        Swal.fire({
          icon: 'success',
          title: '¡Campaña Iniciada!',
          text: `Se encolaron ${customersPayload.length} mensajes en el servidor. Comenzarán a llegar en breve.`,
          confirmButtonColor: '#198754'
        });
      },
      error: (err) => {
        console.error('Error al enviar masivo:', err);
        this.isSending = false;
        Swal.fire('Error', err.error?.msg || 'Error al comunicarse con el servidor de envíos.', 'error');
      }
    });
  }

  // --- VARIABLES PARA IMPORTACIÓN EXCEL ---
  private modalExcelRef!: NgbModalRef;
  archivoExcel: File | null = null;
  clientesAImportar: any[] = [];
  isImporting = false;

  abrirModalExcel(content: any) {
    this.archivoExcel = null;
    this.clientesAImportar = [];
    this.modalExcelRef = this.modalService.open(content, { centered: true, backdrop: 'static', windowClass: 'dark-modal' });
  }

  descargarPlantilla() {
    // 1. Definimos los encabezados exactos y un dato de ejemplo
    const data = [
      {
        'Nombre Completo': 'Juan Perez',
        'Cedula': '12345678',
        'Correo Electronico': 'juan@email.com',
        'Codigo Pais': '58',
        'Telefono': '4141234567'
      }
    ];

    // 2. Creamos el libro y la hoja
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-ajustar ancho de columnas para que se vea bonito
    worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Clientes');

    // 3. Descargar
    XLSX.writeFile(workbook, 'Plantilla_Importacion_Credisanes.xlsx');
  }

  onFileChange(event: any) {
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) {
      Swal.fire('Error', 'No puedes subir múltiples archivos a la vez.', 'error');
      return;
    }

    this.archivoExcel = target.files[0];
    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      // 1. Leer el archivo con XLSX
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      // 2. Tomar la primera hoja
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      // 3. Convertir a JSON
      const data: any[] = XLSX.utils.sheet_to_json(ws);

      // 4. Mapear a lo que espera el Backend (CreateTenantClientDto)
      this.clientesAImportar = data.map(row => ({
        fullName: row['Nombre Completo'] ? String(row['Nombre Completo']).trim() : '',
        cedula: row['Cedula'] ? String(row['Cedula']).trim() : '',
        email: row['Correo Electronico'] ? String(row['Correo Electronico']).trim().toLowerCase() : '',
        countryCode: row['Codigo Pais'] ? String(row['Codigo Pais']).trim() : '+58',
        phoneNumber: row['Telefono'] ? String(row['Telefono']).trim() : ''
      })).filter(c => c.cedula || c.email); // Filtramos filas vacías
    };

    reader.readAsBinaryString(target.files[0]);
  }

  procesarImportacion() {
    if (this.clientesAImportar.length === 0) {
      Swal.fire('Archivo vacío', 'El archivo no contiene clientes válidos o no respeta el formato.', 'warning');
      return;
    }

    this.isImporting = true;

    this.clientsService.importClientsBulk(this.clientesAImportar).subscribe({
      next: (res: any) => {
        this.isImporting = false;
        this.modalExcelRef.close();
        
        // Refrescar tu tabla de clientes aquí
        // this.loadClients(); 

        // Construir mensaje de respuesta
        if (res.failed === 0) {
          Swal.fire('¡Éxito!', `Se importaron los ${res.successful} clientes correctamente.`, 'success');
        } else {
          // Si hubo errores, armamos una tabla en HTML para SweetAlert
          let erroresHtml = `
            <div class="text-start mt-3" style="max-height: 200px; overflow-y: auto;">
              <table class="table table-sm table-bordered" style="font-size: 0.8rem;">
                <thead class="bg-light"><tr><th>Fila</th><th>Cliente</th><th>Motivo</th></tr></thead>
                <tbody>
          `;
          res.errors.forEach((err: any) => {
            erroresHtml += `<tr><td>${err.filaExcel}</td><td>${err.cliente}</td><td class="text-danger">${err.motivo}</td></tr>`;
          });
          erroresHtml += `</tbody></table></div>`;

          Swal.fire({
            icon: 'warning',
            title: 'Importación Parcial',
            html: `
              <p>Se importaron <strong>${res.successful}</strong> clientes.</p>
              <p>Fallaron <strong>${res.failed}</strong> registros:</p>
              ${erroresHtml}
            `,
            width: '600px',
            confirmButtonColor: '#3085d6'
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.isImporting = false;
        Swal.fire('Error', 'Hubo un problema de conexión al procesar el archivo.', 'error');
      }
    });
  }

}
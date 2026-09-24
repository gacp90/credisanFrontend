import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
// 1. IMPORTAMOS SWEETALERT2
import Swal from 'sweetalert2'; 

import { CredisanesService } from '../../../../core/services/credisanes.service';
import { TenantClientsService } from '../../../../core/services/tenant-clients.service';
import { ClienteFormComponent } from '../../clientes/components/cliente-form/cliente-form.component';
import { TransactionsService } from 'src/app/core/services/transactions.service';
import { PaymentMethodsService } from 'src/app/core/services/payment-methods.service';
import { WhatsappTemplatesService } from 'src/app/core/services/whatsapp-templates.service';

@Component({
  selector: 'app-credisan-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ClienteFormComponent, ReactiveFormsModule],
  templateUrl: './credisan-detail.component.html'
})
export class CredisanDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private credisanesService = inject(CredisanesService);
  private clientsService = inject(TenantClientsService);
  private transactionsService = inject(TransactionsService);
  private paymentMethodsService = inject(PaymentMethodsService);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private templatesService = inject(WhatsappTemplatesService);

  credisanId: string = '';
  credisan: any = null;
  assignments: any[] = [];
  
  isLoading = true;
  isActivating = false;

  activeTab: 'search' | 'create' = 'search';
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching = false;
  searchSubject = new Subject<string>();

  // --- VARIABLES PARA EL PANEL ACTIVO (SORTEO) ---
  totalRounds: number = 0;
  currentRoundNumber: number = 2; 
  isDrawing: boolean = false;
  winnerAnimation: string | null = null;

  // NUEVAS VARIABLES
  private modalPreselectRef!: NgbModalRef;
  preselectedWinnerId: string | null = null; // Guarda el ID del ganador secreto
  participantesEnEspera: any[] = []; // Array para el select del engranaje
  ruletaTextActual: string = '¿Quién ganará?';

  ngOnInit() {
    this.credisanId = this.route.snapshot.paramMap.get('id') || '';
    if (this.credisanId) this.loadData();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.ejecutarBusqueda(term);
    });
  }

  abrirEngranaje(content: any) {
    // Filtramos a los que aún no tienen puesto
    this.participantesEnEspera = this.assignments.filter(a => a.positionNumber === null);
    
    if (this.participantesEnEspera.length === 0) {
      Swal.fire('Atención', 'Ya no hay participantes en espera.', 'info');
      return;
    }
    
    this.modalPreselectRef = this.modalService.open(content, { centered: true, size: 'sm', windowClass: 'dark-modal' });
  }

  guardarPreseleccion() {
    this.modalPreselectRef.close();
    // No mostramos ninguna alerta exitosa gigante, solo un toast pequeñito para ser discretos
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Configurado silenciosamente',
      showConfirmButton: false,
      timer: 1500
    });
  }

  loadData() {
    this.isLoading = true;
    this.credisanesService.getCredisanById(this.credisanId).subscribe({
      next: (san) => {
        this.credisan = san;
        this.loadAssignments();
      },
      error: (err) => { 
        console.error(err); 
        this.isLoading = false; 
        Swal.fire('Error', 'No se pudo cargar la información del San', 'error');
      }
    });
  }

  loadAssignments() {
    this.credisanesService.getAssignments(this.credisanId).subscribe({
      next: (data) => {
        // ORDENAMIENTO: Primero los que ya tienen posición (ordenados del 2 en adelante), luego los pendientes.
        this.assignments = data.sort((a, b) => {
          if (a.positionNumber !== null && b.positionNumber !== null) {
            return a.positionNumber - b.positionNumber; // Orden numérico ascendente
          }
          if (a.positionNumber !== null && b.positionNumber === null) return -1; // 'a' va primero
          if (a.positionNumber === null && b.positionNumber !== null) return 1;  // 'b' va primero
          return 0; // Si ambos son null, se quedan igual
        });
        
        if (this.credisan?.status === 'ACTIVE') {
          this.totalRounds = this.credisan.totalPositions + 1;
          const winnersCount = this.assignments.filter(a => a.positionNumber !== null).length;
          this.currentRoundNumber = 2 + winnersCount; 
        }
        
        this.isLoading = false;
      }
    });
  }

  // NUEVA FUNCIÓN: Controla el diseño de las tarjetas dinámicamente
  getCardClass(assignment: any): string {
    // 1. Estado Ruleta: Tarjeta iluminada mientras gira
    if (this.highlightedAssignmentId === assignment._id) {
      return 'border-primary shadow-lg bg-primary bg-opacity-25 scale-up';
    }
    // 2. Estado Sorteado: Ya ganó el San
    if (assignment.positionNumber !== null) {
      // Fondo sutil turquesa/info para hacer énfasis en que ya recibieron
      return 'border-info border-opacity-50 bg-info bg-opacity-10';
    }
    // 3. Estado Pendiente: Fondo oscuro normal
    return 'border-secondary border-opacity-10 bg-dark';
  }

  onSearchInput(event: any) {
    const term = event.target.value;
    if (term.length >= 2) {
      this.isSearching = true;
      this.searchSubject.next(term);
    } else {
      this.searchResults = [];
    }
  }

  ejecutarBusqueda(term: string) {
    this.clientsService.getClients({ search: term, limit: 5 }).subscribe({
      next: (res) => {
        this.searchResults = res.items;
        this.isSearching = false;
      },
      error: () => this.isSearching = false
    });
  }

  agregarParticipante(tenantClientId: string) {
    this.credisanesService.addAssignment(this.credisanId, tenantClientId).subscribe({
      next: () => {
        this.searchQuery = '';
        this.searchResults = [];
        this.loadAssignments();
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Error al agregar participante', 'error')
    });
  }

  removerParticipante(assignmentId: string) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas remover a este cliente del San?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, remover',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.credisanesService.removeAssignment(this.credisanId, assignmentId).subscribe({
          next: () => this.loadAssignments(),
          error: (err) => Swal.fire('Error', 'No se pudo remover al participante', 'error')
        });
      }
    });
  }

  handleClientCreated(nuevoCliente: any) {
    this.agregarParticipante(nuevoCliente.tenantClient._id || nuevoCliente._id);
    this.activeTab = 'search'; 
  }

  activarSan() {
    if (this.assignments.length !== this.credisan.totalPositions) {
      Swal.fire('Cupos incompletos', `Faltan cupos por llenar. Tienes ${this.assignments.length} de ${this.credisan.totalPositions}.`, 'warning');
      return;
    }

    Swal.fire({
      title: '¿Activar San?',
      text: 'Se generarán las cuotas de pago de todo el ciclo. Esta acción es irreversible.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754', // Success color
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, Activar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isActivating = true;
        this.credisanesService.activateSan(this.credisanId).subscribe({
          next: (res) => {
            this.isActivating = false;
            Swal.fire('¡Activado!', res.message, 'success');
            this.loadData();
          },
          error: (err) => {
            this.isActivating = false;
            Swal.fire('Error', err.error?.message || 'Error crítico al activar', 'error');
          }
        });
      }
    });
  }

  highlightedAssignmentId: string | null = null; // NUEVO: Para el efecto visual de la ruleta

  // ... (tus otros métodos se mantienen igual hasta llegar a ejecutarSorteo)

  ejecutarSorteo() {
    Swal.fire({
      title: `Sortear Ronda #${this.currentRoundNumber}`,
      text: '¿Estás seguro de realizar el sorteo para este puesto?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, Sortear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isDrawing = true;
        
        // 1. Preparamos el Body. Le enviamos el ID preseleccionado si existe.
        const payload = {
          roundNumber: this.currentRoundNumber,
          preselectedAssignmentId: this.preselectedWinnerId // Esto lo recibe tu backend nuevo
        };
        
        this.credisanesService.executeDraw(this.credisanId, payload).subscribe({
          next: (res) => {
            // res.winnerId debería devolverte el tenantClientId o el objeto según tu backend
            const ganador = this.assignments.find(a => a.tenantClientId._id === res.winnerId || a.tenantClientId === res.winnerId);
            this.winnerAnimation = ganador?.tenantClientId?.userId?.fullName || 'Participante Afortunado';
            
            // Limpiamos el secreto para que el próximo sorteo vuelva a ser aleatorio si el admin no lo cambia
            this.preselectedWinnerId = null; 

            // 2. Iniciamos el EFECTO DE TEXTO RÁPIDO
            this.iniciarEfectoTextoRuleta();
          },
          error: (err) => {
            this.isDrawing = false;
            Swal.fire('Error', err.error?.message || 'Error al ejecutar sorteo', 'error');
          }
        });
      }
    });
  }

  private iniciarEfectoTextoRuleta() {
    const elegibles = this.assignments.filter(a => a.positionNumber === null);
    
    if (elegibles.length === 0) {
      this.finalizarSorteo();
      return;
    }

    let spins = 0;
    const maxSpins = 40; // Da 40 vueltas de nombres
    let currentDelay = 30; // Arranca súper rápido (30ms)

    const spin = () => {
      const randomIndex = Math.floor(Math.random() * elegibles.length);
      // Muestra nombres aleatorios rápidamente
      this.ruletaTextActual = elegibles[randomIndex].tenantClientId?.userId?.fullName;
      spins++;

      if (spins < maxSpins) {
        // En los últimos 15 saltos, empezamos a frenar drásticamente (fricción)
        if (spins > (maxSpins - 15)) {
            currentDelay += 40; 
        } else {
            currentDelay += 5; // Frenado muy ligero al principio
        }
        setTimeout(spin, currentDelay);
      } else {
        // Último salto: se detiene FIRME en el ganador real dictado por el backend
        this.ruletaTextActual = this.winnerAnimation || '¡Ganador!';
        
        // Esperamos 1 segundo viendo el nombre antes de soltar el confeti/alerta
        setTimeout(() => this.finalizarSorteo(), 1200);
      }
    };

    spin(); // Inicia la magia
  }

  

  // NUEVO: Método para simular la ruleta visual
  private iniciarEfectoRuleta(ganadorReal: any) {
    // Solo participarán en la animación los que aún no tienen puesto
    const elegibles = this.assignments.filter(a => a.positionNumber === null);
    
    if (elegibles.length === 0) {
      this.finalizarSorteo();
      return;
    }

    let spins = 0;
    const maxSpins = 20; // Cantidad de saltos antes de parar
    let currentDelay = 50; // Velocidad inicial (muy rápido)

    const spin = () => {
      // Elegimos un índice al azar para iluminar
      const randomIndex = Math.floor(Math.random() * elegibles.length);
      this.highlightedAssignmentId = elegibles[randomIndex]._id;
      spins++;

      if (spins < maxSpins) {
        // Aumentamos el delay para dar efecto de que se está frenando
        currentDelay += 20; 
        setTimeout(spin, currentDelay);
      } else {
        // Último salto: se detiene en el ganador real
        if (ganadorReal) {
          this.highlightedAssignmentId = ganadorReal._id;
        }
        
        // Esperamos 1 segundo con el ganador iluminado antes de mostrar la alerta
        setTimeout(() => this.finalizarSorteo(), 1000);
      }
    };

    spin(); // Iniciamos la recursividad
  }

  private finalizarSorteo() {
    this.isDrawing = false;
    this.ruletaTextActual = '¿Quién ganará?'; // Resetea el texto central
    
    Swal.fire({
      title: '¡Tenemos un Ganador!',
      html: `El Puesto #${this.currentRoundNumber - 1} fue adjudicado a:<br><strong class="fs-4 text-primary">${this.winnerAnimation}</strong>`,
      icon: 'success',
      confirmButtonColor: '#0d6efd'
    }).then(() => {
      this.loadAssignments(); 
    });
  }

  // --- VARIABLES PARA PANEL DE PAGOS INDIVIDUAL ---
  private modalRef!: NgbModalRef;
  selectedAssignment: any = null;
  clientInstallments: any[] = [];
  paymentMethods: any[] = [];
  isLoadingInstallments = false;
  isReportingPayment = false;

  paymentForm: FormGroup = this.fb.group({
    installmentId: ['', Validators.required],
    paymentMethodId: ['', Validators.required],
    paidAmount: ['', [Validators.required, Validators.min(1)]],
    exchangeRate: [1, [Validators.required, Validators.min(1)]],
    reference: ['', [Validators.required, Validators.minLength(4)]]
  });

  abrirPanelPagos(content: any, assignment: any) {
    this.selectedAssignment = assignment;
    this.modalRef = this.modalService.open(content, { size: 'xl', centered: true, backdrop: 'static', windowClass: 'dark-modal' });
    
    if (this.paymentMethods.length === 0) {
      this.paymentMethodsService.getPaymentMethods().subscribe(data => this.paymentMethods = data);
    }
    
    this.loadInstallments();
  }

  loadInstallments() {
    this.isLoadingInstallments = true;
    this.credisanesService.getInstallmentsByAssignment(this.selectedAssignment._id).subscribe({
      next: (data) => {
        this.clientInstallments = data;
        this.isLoadingInstallments = false;
      },
      error: () => {
        this.isLoadingInstallments = false;
        Swal.fire('Error', 'No se pudieron cargar las cuotas', 'error');
      }
    });
  }

  prepararPago(installment: any) {
    this.paymentForm.reset({
      installmentId: installment._id,
      exchangeRate: 1 
    });
  }

  onPaymentMethodChange() {
    const methodId = this.paymentForm.get('paymentMethodId')?.value;
    const method = this.paymentMethods.find(m => m._id === methodId);
    
    if (method) {
      this.paymentForm.patchValue({ exchangeRate: method.currentExchangeRate });
    }
  }

  get equivalentBaseAmount(): number {
    const paidAmount = this.paymentForm.get('paidAmount')?.value || 0;
    const rate = this.paymentForm.get('exchangeRate')?.value || 1;
    return paidAmount / rate;
  }

  reportarPago() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isReportingPayment = true;
    const formValue = this.paymentForm.value;

    const payload = {
      tenantClientId: this.selectedAssignment.tenantClientId._id || this.selectedAssignment.tenantClientId,
      installmentId: formValue.installmentId,
      paymentMethodId: formValue.paymentMethodId,
      baseAmount: this.equivalentBaseAmount, 
      paidAmount: formValue.paidAmount, 
      exchangeRate: formValue.exchangeRate,
      reference: formValue.reference
    };

    this.transactionsService.reportPayment(payload).subscribe({
      next: () => {
        this.isReportingPayment = false;
        Swal.fire({
          title: '¡Pago Reportado!',
          text: 'El pago ha sido registrado y está en estado PENDIENTE hasta su verificación.',
          icon: 'success',
          confirmButtonColor: '#0d6efd'
        });
        
        this.paymentForm.reset({ exchangeRate: 1 });
        this.loadInstallments(); 
      },
      error: (err) => {
        this.isReportingPayment = false;
        Swal.fire('Error', err.error?.message || 'Error al reportar pago', 'error');
      }
    });
  }

  // --- VARIABLES PARA ENVÍO MASIVO WHATSAPP ---
  private modalWpRef!: NgbModalRef;
  wpTemplates: any[] = [];
  allSanInstallments: any[] = []; // NUEVO: Para guardar todas las cuotas del San
  isLoadingTemplates = false;
  isSendingWp = false;
  templateSelectedApi: any = null;
  audienciaSeleccionada: string = 'TODOS'; 
  clientesFiltradosParaEnvio: any[] = [];

  // --- LÓGICA DE WHATSAPP ---

  abrirModalEnvioMasivo(content: any) {
    if (this.assignments.length === 0) {
      Swal.fire('Sin participantes', 'No hay clientes activos en este San.', 'warning');
      return;
    }
    
    this.templateSelectedApi = null;
    this.audienciaSeleccionada = 'TODOS';
    this.filtrarAudiencia(); 
    
    this.modalWpRef = this.modalService.open(content, { centered: true, size: 'lg', backdrop: 'static', windowClass: 'dark-modal' });
    
    if (this.wpTemplates.length === 0) {
      this.cargarPlantillasApi();
    }

    // NUEVO: Cargamos todas las cuotas del San en segundo plano para saber quién debe
    this.credisanesService.getAllInstallmentsByCredisan(this.credisanId).subscribe({
      next: (data) => this.allSanInstallments = data,
      error: (err) => console.error('No se pudieron cargar las cuotas globales', err)
    });
  }

  cargarPlantillasApi() {
    this.isLoadingTemplates = true;
    this.templatesService.loadTemplates({ desde: 0, hasta: 100, active: true, status: 'APPROVED' }).subscribe({
      next: (res) => {
        this.wpTemplates = res.templates || [];
        this.isLoadingTemplates = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingTemplates = false;
        Swal.fire('Error', 'No se pudieron cargar las plantillas de Meta.', 'error');
      }
    });
  }

  // Se ejecuta cada vez que el usuario cambia el <select> de Audiencia en el modal
  filtrarAudiencia() {
    if (this.audienciaSeleccionada === 'TODOS') {
      this.clientesFiltradosParaEnvio = [...this.assignments];
    } else if (this.audienciaSeleccionada === 'GANADORES') {
      this.clientesFiltradosParaEnvio = this.assignments.filter(a => a.positionNumber !== null);
    } else if (this.audienciaSeleccionada === 'ESPERA') {
      this.clientesFiltradosParaEnvio = this.assignments.filter(a => a.positionNumber === null);
    } else if (this.audienciaSeleccionada === 'DEUDORES') {
      // Filtramos las cuotas que están pendientes
      const rondaDeCobroActiva = this.currentRoundNumber - 1;

      // Filtramos exactamente las cuotas que están pendientes de ESA ronda específica
      const deudoresIds = this.allSanInstallments
        .filter(cuota => cuota.status === 'PENDING' && cuota.roundNumber === rondaDeCobroActiva)
        .map(cuota => cuota.assignmentId?._id || cuota.assignmentId);

      // Asignamos solo a los clientes que aparezcan en esa lista de deudores de la ronda actual
      this.clientesFiltradosParaEnvio = this.assignments.filter(a => deudoresIds.includes(a._id));
    }
  }

  async iniciarEnvioMasivoWp() {
    if (!this.templateSelectedApi) return;
    if (this.clientesFiltradosParaEnvio.length === 0) {
      Swal.fire('Sin destinatarios', 'El filtro seleccionado no tiene clientes.', 'warning');
      return;
    }

    const variablesSoportadasAqui = ['name', 'number', 'proyecto']; 
    const mapeoPlantilla = this.templateSelectedApi.bodyVariablesMapping || [];
    const variablesFaltantes = mapeoPlantilla.filter((v: string) => !variablesSoportadasAqui.includes(v));

    if (variablesFaltantes.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Plantilla Incompatible',
        html: `Faltan las variables <b>(${variablesFaltantes.join(', ')})</b>. Asegúrate de usar una plantilla diseñada para Sanes.`,
        confirmButtonColor: '#f39c12'
      });
      return;
    }

    this.isSendingWp = true;    

    // --- CORRECCIÓN DEL TELÉFONO AQUÍ ---
    const customersPayload = this.clientesFiltradosParaEnvio.map(assignment => {
      // 1. Extraemos código y teléfono
      const codigo = assignment.tenantClientId?.userId?.countryCode || '';
      const numero = assignment.tenantClientId?.userId?.telefono || assignment.tenantClientId?.userId?.phoneNumber || '';
      
      // 2. Concatenamos y eliminamos espacios, guiones, paréntesis y el signo más (+)
      const phone = (codigo + numero).replace(/[\s\-\(\)\+]/g, ''); 

      const name = assignment.tenantClientId?.userId?.fullName || 'Cliente';
      const position = assignment.positionNumber ? `#${assignment.positionNumber}` : 'En Espera';
      const sanName = this.credisan.name || 'San';

      const parametrosDinamicos = mapeoPlantilla.map((variable: string) => {
        if (variable === 'name') return name;
        if (variable === 'number') return position;
        if (variable === 'proyecto') return sanName;
        return ''; 
      }); 

      return { phone: phone, customerName: name, parameters: parametrosDinamicos };
    }).filter(c => c.phone.length >= 10);

    if (customersPayload.length === 0) {
      this.isSendingWp = false;
      Swal.fire('Error', 'Los clientes filtrados no tienen números válidos.', 'error');
      return;
    }

    const payload = {
      templateid: this.templateSelectedApi._id,
      templateName: this.templateSelectedApi.name,
      langCode: this.templateSelectedApi.language,
      customers: customersPayload
    };
    
    this.templatesService.sendTemplateBulk(payload).subscribe({
      next: () => {
        this.isSendingWp = false;
        this.modalWpRef.close();
        Swal.fire({
          icon: 'success',
          title: 'Campaña en Marcha',
          text: `Se procesarán ${customersPayload.length} mensajes para este San.`,
          confirmButtonColor: '#198754'
        });
      },
      error: (err) => {
        this.isSendingWp = false;
        Swal.fire('Error', err.error?.msg || 'Error de conexión con WhatsApp.', 'error');
      }
    });
  }
  

}
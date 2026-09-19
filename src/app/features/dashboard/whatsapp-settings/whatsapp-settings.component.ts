import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { WhatsappService } from 'src/app/core/services/whatsapp.service';
import { SpidiService } from 'src/app/core/services/spidi.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { TenantClientsService } from 'src/app/core/services/tenant-clients.service';

// Importa el servicio que usas para actualizar los datos de la empresa en TU backend principal

declare var FB: any;

interface Channel {
  creditosRifari: number;
  telefono: string;
  estadoLinea: string;
  calidad: string;
  limiteDiario: string;
}

@Component({
  selector: 'app-whatsapp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-settings.component.html'
})
export class WhatsappSettingsComponent implements OnInit {
  private whatsappService = inject(WhatsappService);
  private spidiService = inject(SpidiService);
  private authService = inject(AuthService);
  private tenantService = inject(TenantClientsService); // Usarás este para el PUT {internalApiKey: x}

  public employeeData: any;
  public hasApiKey: boolean = false;
  public esDominioOficial: boolean = false;

  public channelHealth!: Channel;

  // Variables modal recarga
  mostrarModalRecarga: boolean = false;
  cantidadARecargar: number = 25;
  cargandoPago: boolean = false;

  preciosMeta = {
    marketing: 0.080,
    utilidad: 0.015, 
    servicio: 0.015  
  };

  ngOnInit(): void {
    this.employeeData = this.authService.getCurrentEmployee();
    this.hasApiKey = this.authService.hasWhatsappEnabled();
    
    this.verificarDominio();

    if (this.hasApiKey) {
      this.loadHealth();
    }

    if (this.esDominioOficial) {
      this.loadFacebookSDK();
    }
  }

  verificarDominio() {
    const dominiosPermitidos = ['demo.rifari.com', 'cloud.rifari.com', 'www.demo.rifari.com', 'www.cloud.rifari.com', 'localhost'];
    const dominioActual = window.location.hostname;
    this.esDominioOficial = dominiosPermitidos.includes(dominioActual);
  }

  contactarSoporte() {
    const numero = '584247064335';
    const mensaje = encodeURIComponent('Hola, deseo vincular mi número de WhatsApp Business a Credisanes.');
    const url = `https://wa.me/${numero}?text=${mensaje}`;
    window.open(url, '_blank'); 
  }

  loadFacebookSDK() {
    (window as any).fbAsyncInit = function() {
      FB.init({
        appId      : '1797345757607881', 
        cookie     : true,
        autoLogAppEvents: true,        
        xfbml      : true,               
        version    : 'v25.0'             
      });
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }

  wabaIdRecibido: string = '';
  telefonoIdRecibido: string = '';
  business_id: string = '';

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (!event.origin.endsWith('facebook.com')) return;
    try {
      const payloadMeta = JSON.parse(event.data);
      if (payloadMeta.type === 'WA_EMBEDDED_SIGNUP') {
        if (payloadMeta.event === 'FINISH' || (payloadMeta.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' && payloadMeta.data)) {
          this.wabaIdRecibido = payloadMeta.data.waba_id;
          this.telefonoIdRecibido = payloadMeta.data.phone_number_id;
          if (payloadMeta.data.business_id) {
            this.business_id = payloadMeta.data.business_id;
          }
        }
      } 
    } catch (e) { }
  }

  launchWhatsAppSignup() {
    FB.login((response: any) => {
      if (response.authResponse) {
        const payloadBackend = {
          code: response.authResponse.code,
          wabaId: this.wabaIdRecibido,
          phoneNumberId: this.telefonoIdRecibido,
          business_id: this.business_id || ''
        };

        this.whatsappService.checkTokenAndRegister(payloadBackend).subscribe({
          next: (respuestaBackend: any) => {
            const internalApiKey = respuestaBackend.data.internalApiKey;
            
                      },
          error: () => Swal.fire('Error', 'No se pudo vincular tu WhatsApp.', 'error')
        });
      }
    }, {
      config_id: '1290484799111322', 
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" }
    });
  }

  loadHealth() {
    this.whatsappService.healt().subscribe({ 
      next: (resp: any) =>{
        this.channelHealth = resp.data;
        if (resp.data.status === 'PENDING') {
            this.channelHealth.limiteDiario = '0'; 
            this.channelHealth.calidad = 'UNKNOWN';
        } else if (resp.data.limiteDiario) {
            this.channelHealth.limiteDiario = resp.data.limiteDiario.includes('TIER_') 
                ? resp.data.limiteDiario.split('TIER_')[1] 
                : resp.data.limiteDiario;
        }            
      }
    });
  }

  abrirModalRecarga() { this.mostrarModalRecarga = true; }
  cerrarModalRecarga() { this.mostrarModalRecarga = false; }
  seleccionarMonto(monto: number) { this.cantidadARecargar = monto; }

  get estimacionMarketing() { return Math.floor(this.cantidadARecargar / this.preciosMeta.marketing); }
  get estimacionUtilidad() { return Math.floor(this.cantidadARecargar / this.preciosMeta.utilidad); }

  iniciarPagoSpidi() {
    if (this.cantidadARecargar < 5) {
      Swal.fire('Monto mínimo', 'La recarga mínima es de 5 USD.', 'warning');
      return;
    }
    
    this.cargandoPago = true;
    const nombreParaFacturar = this.employeeData?.fullName || 'Credisanes User';

    this.spidiService.crearCheckout(this.cantidadARecargar, nombreParaFacturar).subscribe({
      next: (res: any) => {
        if (res.ok && res.url) {
          window.location.href = res.url; 
        }
      },
      error: (err) => {
        this.cargandoPago = false;
        Swal.fire('Error', err.error?.msg || 'Error de conexión.', 'error');
      }
    });
  }
}
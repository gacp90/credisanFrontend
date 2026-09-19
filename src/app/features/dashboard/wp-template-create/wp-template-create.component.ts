import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';


// Si usas @ctrl/ngx-emoji-mart, impórtalo aquí. Ejemplo:
import { PickerModule } from '@ctrl/ngx-emoji-mart'; 
import { WhatsappTemplatesService } from 'src/app/core/services/whatsapp-templates.service';

@Component({
  selector: 'app-wp-template-create',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule /*, PickerModule */], 
  templateUrl: './wp-template-create.component.html'
})
export class WpTemplateCreateComponent {
  private templatesService = inject(WhatsappTemplatesService);
  private router = inject(Router);
  
  // Reemplaza esto con tu método de autenticación/Tenant actual
  public internalApiKey: string = 'AQUI_TU_API_KEY_DEL_TENANT'; 
  public sendTemplate: boolean = false;

  nuevaPlantilla = {
    name: '',
    category: 'MARKETING',
    language: 'es',
    headerType: 'NONE', 
    headerText: '',
    bodyText: '',
    footerText: '',
    quickReplies: [] as { text: string }[]
  };

  archivoSeleccionado: File | null = null;
  vistaPreviaUrl: string | ArrayBuffer | null = null;

  nuevaRespuesta: string = '';
  variablesDetectadas: string[] = [];
  ejemplosVariables: { [key: string]: string } = {};

  // ==========================================
  // MULTIMEDIA: SELECCIÓN Y VISTA PREVIA
  // ==========================================
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) {
      this.limpiarArchivo();
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (this.nuevaPlantilla.headerType === 'IMAGE' && !isImage) {
      Swal.fire('Error', 'Seleccionaste "Imagen" pero subiste otro formato.', 'error');
      this.limpiarArchivo();
      return;
    }

    if (this.nuevaPlantilla.headerType === 'VIDEO' && !isVideo) {
      Swal.fire('Error', 'Seleccionaste "Video" pero subiste otro formato.', 'error');
      this.limpiarArchivo();
      return;
    }

    const maxSizeMB = isVideo ? 16 : 5;
    if (file.size / (1024 * 1024) > maxSizeMB) {
      Swal.fire('Archivo muy pesado', `El límite para ${isVideo ? 'videos es de 16MB' : 'imágenes es de 5MB'}.`, 'warning');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado = file;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => this.vistaPreviaUrl = reader.result;
      reader.readAsDataURL(file);
    } else {
      this.vistaPreviaUrl = null; 
    }
  }

  limpiarArchivo() {
    this.archivoSeleccionado = null;
    this.vistaPreviaUrl = null;
    if (['IMAGE', 'VIDEO'].includes(this.nuevaPlantilla.headerType)) {
      const fileInput = document.getElementById('mediaInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  cambioHeaderType() {
    this.limpiarArchivo();
    this.nuevaPlantilla.headerText = '';
  }

  // ==========================================
  // CUERPO DEL MENSAJE Y VARIABLES
  // ==========================================
  insertarVariable(variable: string, inputElement: HTMLTextAreaElement) {
    const start = inputElement.selectionStart;
    const end = inputElement.selectionEnd;
    const textoActual = this.nuevaPlantilla.bodyText;

    this.nuevaPlantilla.bodyText = textoActual.substring(0, start) + variable + textoActual.substring(end);
    this.actualizarVariables(); 

    setTimeout(() => {
      inputElement.focus();
      inputElement.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  actualizarVariables() {
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    const encontradas = new Set<string>(); 

    while ((match = regex.exec(this.nuevaPlantilla.bodyText)) !== null) {
      encontradas.add(match[1]);
    }

    this.variablesDetectadas = Array.from(encontradas);
    this.variablesDetectadas.forEach(v => {
      if (!this.ejemplosVariables[v]) this.ejemplosVariables[v] = '';
    });
  }

  // ==========================================
  // RESPUESTAS RÁPIDAS
  // ==========================================
  agregarRespuestaRapida() {
    const textoLimpio = this.nuevaRespuesta.trim();
    if (!textoLimpio) return;
    
    if (this.nuevaPlantilla.quickReplies.length >= 3) {
      Swal.fire('Límite alcanzado', 'Meta solo permite un máximo de 3 respuestas rápidas.', 'warning');
      return;
    }

    this.nuevaPlantilla.quickReplies.push({ text: textoLimpio });
    this.nuevaRespuesta = ''; 
  }

  eliminarRespuestaRapida(index: number) {
    this.nuevaPlantilla.quickReplies.splice(index, 1);
  }

  // ==========================================
  // GUARDAR Y ENVIAR AL BACKEND
  // ==========================================
  public textoEstado: string = '';
  async guardarYEnviar() {
    if (!this.nuevaPlantilla.name || !this.nuevaPlantilla.bodyText) {
      Swal.fire('Campos obligatorios', 'El nombre y el mensaje principal son obligatorios.', 'warning');
      return;
    }

    const faltanEjemplos = this.variablesDetectadas.some(v => !this.ejemplosVariables[v]?.trim());
    if (faltanEjemplos) {
      Swal.fire('Faltan ejemplos', 'Meta exige un texto de ejemplo para cada variable dinámica.', 'warning');
      return;
    }

    if (['IMAGE', 'VIDEO'].includes(this.nuevaPlantilla.headerType) && !this.archivoSeleccionado) {
      Swal.fire('Falta archivo', 'Seleccionaste un encabezado multimedia pero no adjuntaste ningún archivo.', 'warning');
      return;
    }

    this.sendTemplate = true;
    this.textoEstado = 'Auditando con IA (Protección Anti-bloqueos)...';

    const textoCompleto = `
      Encabezado: ${this.nuevaPlantilla.headerText}
      Cuerpo: ${this.nuevaPlantilla.bodyText}
      Pie de página: ${this.nuevaPlantilla.footerText}
      Botones: ${this.nuevaPlantilla.quickReplies.map(q => q.text).join(' | ')}
    `;

    this.templatesService.validarPlantillaIA(textoCompleto, this.archivoSeleccionado || undefined)
      .subscribe({
        next: (aiResponse: any) => {
          if (aiResponse.aprobado) {
            this.textoEstado = 'IA Aprobada. Subiendo a Meta...';
            Swal.fire({
              icon: 'success',
              title: '¡Plantilla Aprobada por IA!',
              text: 'Tu plantilla ha pasado la auditoría de seguridad y será enviada a revisión en Meta.',
              confirmButtonText: 'Continuar',
              cancelButtonText: 'Cancelar',
              showCancelButton: true,
              confirmButtonColor: '#0d6efd'
            }).then((result) => {
              if (result.isConfirmed) this.ejecutarEnvioAMeta();
              else this.sendTemplate = false;
            });
          } else {
            this.sendTemplate = false;
            this.mostrarModalRechazoIA(aiResponse);
          }
        },
        error: (err: any) => {
          console.error('Error en la IA:', err);
          this.sendTemplate = false;
          Swal.fire('Error de Validación', err.error?.msg || 'Ocurrió un error al auditar la plantilla.', 'error');
        }
      });
  }

  private ejecutarEnvioAMeta() {
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    const ordenVariables: string[] = [];
    while ((match = regex.exec(this.nuevaPlantilla.bodyText)) !== null) {
      ordenVariables.push(match[1]); 
    }
    const metaExamplesArray = ordenVariables.map(variable => this.ejemplosVariables[variable]);

    const payload = {
      name: this.nuevaPlantilla.name.trim().toLowerCase().replace(/\s+/g, '_'),
      language: this.nuevaPlantilla.language,
      category: this.nuevaPlantilla.category,
      headerType: this.nuevaPlantilla.headerType,
      headerText: this.nuevaPlantilla.headerText,
      bodyText: this.nuevaPlantilla.bodyText,
      footerText: this.nuevaPlantilla.footerText,
      quickReplies: this.nuevaPlantilla.quickReplies.map(qr => qr.text),
      exampleBodyText: metaExamplesArray.length > 0 ? [ metaExamplesArray ] : []
    };    

    let request$;
    if (['IMAGE', 'VIDEO'].includes(this.nuevaPlantilla.headerType)) {
      const formData = new FormData();
      formData.append('file', this.archivoSeleccionado!);
      formData.append('templateData', JSON.stringify(payload));
      request$ = this.templatesService.crearPlantillaMedia(formData);
    } else {
      request$ = this.templatesService.createTemplate(payload);
    }

    request$.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: '¡Plantilla enviada a revisión!',
          text: 'La plantilla ha superado la IA y fue registrada en Meta exitosamente.',
          confirmButtonText: 'Ver mis plantillas',
          confirmButtonColor: '#0d6efd'
        }).then(() => {
          this.router.navigate(['/dashboard/plantillas']);
        });
        this.sendTemplate = false;
      },
      error: (err: any) => {
        console.error('Error al enviar plantilla a Meta:', err);
        Swal.fire('Error de Meta', err.error?.msg || 'Error al comunicarse con Meta.', 'error');
        this.sendTemplate = false;
      }
    });
  }

  private mostrarModalRechazoIA(aiResponse: any) {
    let sugerenciasHtml = '';
    
    if (aiResponse.plantillas_sugeridas && aiResponse.plantillas_sugeridas.length > 0) {
      const listaLi = aiResponse.plantillas_sugeridas.map((s: string) => {
        const textoEscapado = s.replace(/'/g, "\\'"); 
        return `
          <div style="margin-bottom: 15px; padding: 15px; background-color: rgba(25, 135, 84, 0.1); border-left: 4px solid #198754; border-radius: 6px;">
            <p style="margin-bottom: 10px; font-size: 0.95em; color: #fff;">${s}</p>
            <button 
              onclick="navigator.clipboard.writeText('${textoEscapado}').then(() => { this.innerHTML = '<i class=\\'bi bi-check2\\'></i> ¡Copiado!'; setTimeout(() => this.innerHTML = '<i class=\\'bi bi-files\\'></i> Copiar Plantilla', 2000); })" 
              style="background: #2b3035; border: 1px solid #495057; color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: bold; transition: all 0.2s;">
              <i class="bi bi-files"></i> Copiar Plantilla
            </button>
          </div>
        `;
      }).join('');

      sugerenciasHtml = `
        <hr style="border-color: #495057; margin: 20px 0;">
        <div style="text-align: left;">
          <h6 style="color: #198754; font-weight: bold; margin-bottom: 10px;">
            <i class="bi bi-lightbulb"></i> Plantillas 100% Seguras Sugeridas:
          </h6>
          <p style="color: #adb5bd; font-size: 0.85em; margin-bottom: 15px;">Haz clic en "Copiar" y reemplaza tu texto actual con alguna de estas opciones:</p>
          ${listaLi}
        </div>
      `;
    }

    Swal.fire({
      icon: 'error',
      title: '¡Riesgo de Bloqueo Detectado!',
      background: 'var(--bs-card-bg)',
      color: '#fff',
      html: `
        <div style="text-align: left; font-size: 0.95em;">
          <p style="color: #dc3545; font-weight: bold;">Nuestra IA de seguridad ha detenido este envío para proteger tu número de WhatsApp.</p>
          <p style="color: #dee2e6;"><strong>Motivo detectado:</strong> ${aiResponse.motivo_rechazo}</p>
        </div>
        ${sugerenciasHtml}
      `,
      width: '750px',
      confirmButtonText: 'Cerrar y corregir mi texto',
      confirmButtonColor: '#0d6efd',
      allowOutsideClick: false
    });
  }

  // ==========================================
  // FUNCION DE EMOJIS
  // ==========================================
  mostrarEmojis: boolean = false;

  addEmoji(event: any, inputElement: HTMLTextAreaElement) {
    const emoji = event.emoji.native; 
    const start = inputElement.selectionStart;
    const end = inputElement.selectionEnd;
    const textoActual = this.nuevaPlantilla.bodyText;

    this.nuevaPlantilla.bodyText = textoActual.substring(0, start) + emoji + textoActual.substring(end);
    this.actualizarVariables();

    setTimeout(() => {
      inputElement.focus();
      inputElement.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  toggleEmojis() {
    this.mostrarEmojis = !this.mostrarEmojis;
  }
}
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/core/services/auth.service';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  public currentUser: any = null;

  // Formularios
  public profileForm!: FormGroup;
  public passwordForm!: FormGroup;

  // Estados de carga
  public isUpdatingProfile = false;
  public isUpdatingPassword = false;

  // UX de Contraseñas
  public showCurrentPwd = false;
  public showNewPwd = false;

  ngOnInit(): void {
    // Cargamos los datos del LocalStorage (o de donde los guardes en el login)
    this.currentUser = this.authService.getCurrentEmployee();

    // Inicializamos el formulario de Perfil con los datos actuales
    this.profileForm = this.fb.group({
      fullName: [this.currentUser?.fullName || '', [Validators.required, Validators.minLength(3)]],
      cedula: [this.currentUser?.cedula || '', Validators.required],
      email: [this.currentUser?.email || '', [Validators.required, Validators.email]],
      // Si tienes el teléfono guardado, lo agregas aquí. Ej:
      // phoneNumber: [this.currentUser?.phoneNumber || '', Validators.required],
    });

    // Inicializamos el formulario de Seguridad
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatchValidator });
  }

  // Validador personalizado para asegurar que las contraseñas coincidan
  passwordsMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  actualizarPerfil() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isUpdatingProfile = true;
    const userId = this.currentUser.id || this.currentUser._id;

    this.authService.updateProfile(userId, this.profileForm.value).subscribe({
      next: (res: any) => {
        this.isUpdatingProfile = false;
        
        // Actualizamos el objeto en LocalStorage para que los cambios se reflejen sin recargar
        const updatedUser = { ...this.currentUser, ...this.profileForm.value };
        localStorage.setItem('current_employee', JSON.stringify(updatedUser));
        
        Swal.fire({
          icon: 'success',
          title: 'Perfil Actualizado',
          text: 'Tus datos han sido guardados correctamente.',
          confirmButtonColor: '#0d6efd',
        });
      },
      error: (err) => {
        this.isUpdatingProfile = false;
        Swal.fire('Error', err.error?.message || 'No se pudo actualizar el perfil.', 'error');
      }
    });
  }

  cambiarPassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isUpdatingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isUpdatingPassword = false;
        this.passwordForm.reset();
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña Cambiada!',
          text: 'Tu seguridad ha sido actualizada.',
          confirmButtonColor: '#198754'
        });
      },
      error: (err) => {
        this.isUpdatingPassword = false;
        Swal.fire('Error', err.error?.message || 'Contraseña actual incorrecta.', 'error');
      }
    });
  }
}
import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  email           = '';
  newPassword     = '';
  confirmPassword = '';
  isLoading       = signal<boolean>(false);
  error           = signal<string>('');

  constructor(
    private auth: AuthService,
    private toast: ToastService,
    private router: Router,
  ) {}

  async onSubmit(): Promise<void> {
    this.error.set('');

    if (!this.email || !this.newPassword || !this.confirmPassword) {
      this.error.set('Completa todos los campos');
      return;
    }
    if (this.newPassword.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.auth.recoverPassword(this.email, this.newPassword);
      this.toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
      this.router.navigate(['/login']);
    } catch (e: any) {
      const msg = e?.error?.detail ?? 'No se pudo actualizar la contraseña';
      this.error.set(msg);
      this.toast.error(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}

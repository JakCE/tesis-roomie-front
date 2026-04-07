import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email    = '';
  password = '';
  error    = signal<string>('');

  constructor(
    public auth: AuthService,
    private toast: ToastService
  ) {}

  async onLogin(): Promise<void> {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Completa todos los campos');
      this.toast.error('Completa todos los campos');
      return;
    }
    try {
      await this.auth.login(this.email, this.password);
      this.toast.success('Sesión iniciada');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error al ingresar');
      this.toast.error(e?.message ?? 'Error al ingresar');
    }
  }
}
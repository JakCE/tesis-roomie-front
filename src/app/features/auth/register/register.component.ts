import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { UserProfile } from '../../../core/models/user-profile.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  step = signal<number>(1);
  name     = '';
  email    = '';
  password = '';

  maxBirthDate: string = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  profile: Partial<UserProfile> = {
    display_name:      '',
    gender:            'other',
    birth_date:        '',
    avatar_url:        '',
    occupation:        'student',
    budget_min:        500,
    budget_max:        1500,
    preferred_zone:    '',
    preferred_lat:     0,
    preferred_lng:     0,
    search_radius_km:  5,
    schedule:          'flexible',
    cleanliness_level: 3,
    noise_tolerance:   3,
    has_pets:          false,
    accepts_pets:      false,
    smokes:            false,
    accepts_smokers:   false,
    has_car:           false,
    age_range_min:     18,
    age_range_max:     40,
    gender_preference: 'any',
    bio:               '',
    embedding_vector:  '',
    is_visible:        true,
  };

  constructor(
    public auth: AuthService,
    private toast: ToastService,
    private geo: GeocodingService
  ) {}

  async nextStep(): Promise<void> {
    if (this.step() === 1) {
      if (!this.name || !this.email || !this.password) {
        this.toast.error('Completa todos los campos');
        return;
      }
      if (this.password.length < 8) {
        this.toast.error('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (!this.profile.birth_date) {
        this.toast.error('Ingresa tu fecha de nacimiento');
        return;
      }
      if (!this.profile.gender) {
        this.toast.error('Selecciona tu género');
        return;
      }
    }

    if (this.step() === 2) {
      if (!this.profile.preferred_zone) {
        this.toast.error('Ingresa tu zona preferida');
        return;
      }
      if (!this.profile.budget_min || !this.profile.budget_max) {
        this.toast.error('Ingresa tu rango de presupuesto');
        return;
      }
      if ((this.profile.budget_min ?? 0) >= (this.profile.budget_max ?? 0)) {
        this.toast.error('El presupuesto mínimo debe ser menor al máximo');
        return;
      }
      const coords = await this.geo.getCoordinates(this.profile.preferred_zone!);
      if (coords) {
        this.profile.preferred_lat = coords.lat;
        this.profile.preferred_lng = coords.lng;
      } else {
        this.toast.info('No se encontraron coordenadas para esa zona, puedes continuar igual');
      }
    }

    if (this.step() === 3) {
      if ((this.profile.age_range_min ?? 0) >= (this.profile.age_range_max ?? 0)) {
        this.toast.error('La edad mínima debe ser menor a la máxima');
        return;
      }
    }

    this.step.update(s => s + 1);
  }

  prevStep(): void {
    this.step.update(s => s - 1);
  }

  async onRegister(): Promise<void> {
    try {
      this.profile.display_name = this.name;
      await this.auth.register(this.email, this.password, this.name, this.profile);
      this.toast.success('¡Cuenta creada exitosamente!');
    } catch (e: any) {
      this.toast.error(e?.message ?? 'Error al crear la cuenta');
    }
  }
}
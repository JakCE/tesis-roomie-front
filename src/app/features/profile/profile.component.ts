import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { ToastService } from '../../core/services/toast.service';
import { WeightsService, UserWeights } from '../../core/services/weights.service';
import { UserProfile } from '../../core/models/user-profile.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  isLoading       = signal<boolean>(false);
  isSaving        = signal<boolean>(false);
  isEditing       = signal<boolean>(false);
  isSavingWeights = signal<boolean>(false);
  profile         = signal<UserProfile | null>(null);

  editData: Partial<UserProfile> = {};

  weights: UserWeights = {
    w_budget: 4, w_zone: 4, w_schedule: 3,
    w_cleanliness: 3, w_noise: 2, w_pets: 1,
    w_smoking: 1, w_age: 1, w_gender: 1,
  };

  readonly weightLabels: { key: keyof UserWeights; label: string; desc: string }[] = [
    { key: 'w_budget',      label: 'Presupuesto',   desc: 'Compatibilidad de rango de alquiler' },
    { key: 'w_zone',        label: 'Ubicación',     desc: 'Zona y radio de búsqueda' },
    { key: 'w_schedule',    label: 'Horario',       desc: 'Diurno, nocturno o flexible' },
    { key: 'w_cleanliness', label: 'Limpieza',      desc: 'Nivel de orden en el hogar' },
    { key: 'w_noise',       label: 'Ruido',         desc: 'Tolerancia al ruido' },
    { key: 'w_pets',        label: 'Mascotas',      desc: 'Tenencia y aceptación de mascotas' },
    { key: 'w_smoking',     label: 'Tabaco',        desc: 'Fumador y aceptación de fumadores' },
    { key: 'w_age',         label: 'Edad',          desc: 'Rango etario preferido' },
    { key: 'w_gender',      label: 'Género',        desc: 'Preferencia de género del roomie' },
  ];

  constructor(
    public auth: AuthService,
    private profileService: ProfileService,
    private geo: GeocodingService,
    private toast: ToastService,
    private weightsService: WeightsService,
  ) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProfile(), this.loadWeights()]);
  }

  async loadWeights(): Promise<void> {
    const userId = this.auth.currentUser()?.$id;
    if (!userId) return;
    const w = await this.weightsService.getWeights(userId);
    // convertir de 0-1 a escala 1-10
    const toSlider = (v: number) => Math.max(1, Math.round(v * 50));
    this.weights = {
      w_budget:      toSlider(w.w_budget),
      w_zone:        toSlider(w.w_zone),
      w_schedule:    toSlider(w.w_schedule),
      w_cleanliness: toSlider(w.w_cleanliness),
      w_noise:       toSlider(w.w_noise),
      w_pets:        toSlider(w.w_pets),
      w_smoking:     toSlider(w.w_smoking),
      w_age:         toSlider(w.w_age),
      w_gender:      toSlider(w.w_gender),
    };
  }

  importanceLabel(val: number): string {
    if (val <= 2)  return 'Poco importante';
    if (val <= 4)  return 'Algo importante';
    if (val <= 6)  return 'Importante';
    if (val <= 8)  return 'Muy importante';
    return 'Esencial';
  }

  importanceColor(val: number): string {
    if (val <= 2)  return 'text-gray-400';
    if (val <= 4)  return 'text-blue-400';
    if (val <= 6)  return 'text-violet-500';
    if (val <= 8)  return 'text-violet-600';
    return 'text-violet-800';
  }

  async saveWeights(): Promise<void> {
    const userId = this.auth.currentUser()?.$id;
    if (!userId) return;
    this.isSavingWeights.set(true);
    try {
      // mandar valores crudos — el backend normaliza a suma=1
      await this.weightsService.saveWeights(userId, {
        w_budget:      this.weights.w_budget      / 10,
        w_zone:        this.weights.w_zone        / 10,
        w_schedule:    this.weights.w_schedule    / 10,
        w_cleanliness: this.weights.w_cleanliness / 10,
        w_noise:       this.weights.w_noise       / 10,
        w_pets:        this.weights.w_pets        / 10,
        w_smoking:     this.weights.w_smoking     / 10,
        w_age:         this.weights.w_age         / 10,
        w_gender:      this.weights.w_gender      / 10,
      });
      this.toast.success('Preferencias de matching actualizadas');
    } catch {
      this.toast.error('Error al guardar las preferencias');
    } finally {
      this.isSavingWeights.set(false);
    }
  }

  async loadProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
      const userId = this.auth.currentUser()!.$id;
      const data   = await this.profileService.getProfile(userId);
      this.profile.set(data);
    } catch {
      this.toast.error('Error al cargar el perfil');
    } finally {
      this.isLoading.set(false);
    }
  }

  startEditing(): void {
    const current = this.profile();
    if (!current) return;

    this.editData = { ...current };
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.editData = {};
    this.isEditing.set(false);
  }

  async saveProfile(): Promise<void> {
    this.isSaving.set(true);
    try {
      const userId = this.auth.currentUser()!.$id;

      // actualizar coordenadas si cambia zona
      if (this.editData.preferred_zone !== this.profile()?.preferred_zone) {
        const coords = await this.geo.getCoordinates(this.editData.preferred_zone!);
        if (coords) {
          this.editData.preferred_lat = coords.lat;
          this.editData.preferred_lng = coords.lng;
        }
      }

      const updated = await this.profileService.updateProfile(userId, this.editData);
      this.profile.set(updated);
      this.isEditing.set(false);
      this.toast.success('Perfil actualizado correctamente');
    } catch {
      this.toast.error('Error al guardar el perfil');
    } finally {
      this.isSaving.set(false);
    }
  }

  toggleVisibility(): void {
    const current = this.profile();
    if (!current) return;

    this.editData = {
      ...current,
      is_visible: !current.is_visible
    };

    this.saveProfile();
  }

  // helpers
  getAge(birthDate: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  getCleanlinessLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Muy relajado', 2: 'Relajado', 3: 'Normal', 4: 'Ordenado', 5: 'Muy ordenado'
    };
    return labels[level] ?? 'Normal';
  }

  getNoiseLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Silencio total', 2: 'Muy silencioso', 3: 'Normal', 4: 'Tolerante', 5: 'No importa'
    };
    return labels[level] ?? 'Normal';
  }

  getScheduleLabel(s: string): string {
    const labels: Record<string, string> = {
      morning: 'Diurno', night: 'Nocturno', flexible: 'Flexible'
    };
    return labels[s] ?? s;
  }

  getOccupationLabel(o: string): string {
    const labels: Record<string, string> = {
      student: 'Estudiante', employed: 'Empleado',
      freelancer: 'Freelancer', other: 'Otro'
    };
    return labels[o] ?? o;
  }

  getGenderLabel(g: string): string {
    const labels: Record<string, string> = {
      male: 'Hombre', female: 'Mujer', other: 'Prefiero no decir'
    };
    return labels[g] ?? g;
  }

  getGenderPrefLabel(g: string): string {
    const labels: Record<string, string> = {
      male: 'Hombre', female: 'Mujer', any: 'Sin preferencia'
    };
    return labels[g] ?? g;
  }

  get maxBirthDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }
}
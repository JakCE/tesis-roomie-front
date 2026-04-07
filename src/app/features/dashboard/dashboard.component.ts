import { Component, signal, computed, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { InteractionService } from '../../core/services/interaction.service';
import { MatchService } from '../../core/services/match.service';
import { ToastService } from '../../core/services/toast.service';
import { RecommendationService, RecommendedProfile } from '../../core/services/recommendation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  isLoading  = signal<boolean>(true);
  currentIdx = signal<number>(0);
  profiles   = signal<RecommendedProfile[]>([]);

  currentProfile = computed(() => this.profiles()[this.currentIdx()]);
  hasProfiles    = computed(() => this.currentIdx() < this.profiles().length);

  private readonly AVATAR_COLORS = [
    'bg-pink-400', 'bg-blue-400', 'bg-emerald-400',
    'bg-amber-400', 'bg-violet-400', 'bg-rose-400',
    'bg-cyan-400',  'bg-orange-400',
  ];

  readonly genderLabel: Record<string, string> = {
    male: 'Hombre', female: 'Mujer', other: 'Otro',
  };

  readonly occupationLabel: Record<string, string> = {
    student: 'Estudiante', employed: 'Empleado',
    freelancer: 'Freelancer', other: 'Otro',
  };

  readonly scheduleLabel: Record<string, string> = {
    morning: 'Diurno', night: 'Nocturno', flexible: 'Flexible',
  };

  constructor(
    public auth: AuthService,
    private interaction: InteractionService,
    private matchService: MatchService,
    private toast: ToastService,
    private recommendation: RecommendationService,
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    try {
      const [recs, seenIds] = await Promise.all([
        this.recommendation.getRecommendations(user.$id, 20),
        this.interaction.getSeenUserIds(user.$id).catch(() => [] as string[]),
      ]);
      const seenSet = new Set(seenIds);
      this.profiles.set(recs.filter(r => !seenSet.has(r.profile.$id)));
    } catch (err) {
      console.error('[Dashboard] Error al cargar recomendaciones:', err);
      this.toast.error('Error al cargar recomendaciones');
    } finally {
      this.isLoading.set(false);
    }
  }

  getAvatarColor(userId: string): string {
    const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return this.AVATAR_COLORS[hash % this.AVATAR_COLORS.length];
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  }

  getAge(birthDate: string): number {
    const today = new Date();
    const dob   = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  getCompatibility(score: number): number {
    return Math.round(score * 100);
  }

  getCleanlinessLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Muy relajado', 2: 'Relajado', 3: 'Normal', 4: 'Ordenado', 5: 'Muy ordenado',
    };
    return labels[level] ?? 'Normal';
  }

  getNoiseLabel(level: number): string {
    const labels: Record<number, string> = {
      1: 'Silencio total', 2: 'Muy silencioso', 3: 'Normal', 4: 'Tolerante', 5: 'No importa',
    };
    return labels[level] ?? 'Normal';
  }

  async onLike(): Promise<void> {
    const rec = this.currentProfile();
    if (!rec || !this.auth.currentUser()) return;
    this.isLoading.set(true);
    try {
      const userId = this.auth.currentUser()!.$id;
      const toId   = rec.profile.$id;
      console.log('[Like] 1. createInteraction', { userId, toId });
      await this.interaction.createInteraction(userId, toId, 'like');
      console.log('[Like] 2. createInteraction OK — checking mutual...');
      const isMutual = await this.interaction.checkMutualLike(userId, toId);
      console.log('[Like] 3. checkMutualLike result:', isMutual);
      if (isMutual) {
        console.log('[Like] 4. creating match...');
        await this.matchService.createMatch(userId, toId, rec.hybrid_score);
        console.log('[Like] 5. match created OK');
        this.toast.success(`¡Match con ${rec.profile.display_name ?? 'este usuario'}! 🎉`);
      } else {
        this.toast.info(`Le diste like a ${rec.profile.display_name ?? 'este usuario'}`);
      }
      this.nextProfile();
    } catch (err) {
      console.error('[Like] ERROR:', err);
      this.toast.error('Error al registrar like');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDislike(): Promise<void> {
    const rec = this.currentProfile();
    if (!rec || !this.auth.currentUser()) return;
    try {
      const userId = this.auth.currentUser()!.$id;
      await this.interaction.createInteraction(userId, rec.profile.$id, 'dislike');
      this.nextProfile();
    } catch {
      this.toast.error('Error al registrar dislike');
    }
  }

  async onSkip(): Promise<void> {
    const rec = this.currentProfile();
    if (!rec || !this.auth.currentUser()) return;
    try {
      const userId = this.auth.currentUser()!.$id;
      await this.interaction.createInteraction(userId, rec.profile.$id, 'skip');
      this.nextProfile();
    } catch {
      this.toast.error('Error al saltar perfil');
    }
  }

  private nextProfile(): void {
    this.currentIdx.update(i => i + 1);
  }
}

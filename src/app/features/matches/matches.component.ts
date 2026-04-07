import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatchService } from '../../core/services/match.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { Match } from '../../core/models/match.model';
import { UserProfile } from '../../core/models/user-profile.model';

interface MatchWithProfile {
  match:        Match;
  otherProfile: UserProfile;
}

interface ExplainResult {
  explanation: string;
  total_score: number;
  dimensions: { name: string; score: number; weight: number }[];
}

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.css',
})
export class MatchesComponent implements OnInit {
  isLoading      = signal(true);
  matches        = signal<MatchWithProfile[]>([]);
  explainLoading = signal(false);
  explainResult  = signal<ExplainResult | null>(null);
  explainTarget  = signal<MatchWithProfile | null>(null);

  private readonly AVATAR_COLORS = [
    'bg-pink-400', 'bg-blue-400', 'bg-emerald-400',
    'bg-amber-400', 'bg-violet-400', 'bg-rose-400',
    'bg-cyan-400',  'bg-orange-400',
  ];

  readonly occupationLabel: Record<string, string> = {
    student: 'Estudiante', employed: 'Empleado',
    freelancer: 'Freelancer', other: 'Otro',
  };

  constructor(
    public auth: AuthService,
    private matchService: MatchService,
    private profileService: ProfileService,
    private toast: ToastService,
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    try {
      const rawMatches = await this.matchService.getMyMatches(user.$id);
      const withProfiles = await Promise.all(
        rawMatches.map(async (match) => {
          const otherId      = match.user_a_id === user.$id ? match.user_b_id : match.user_a_id;
          const otherProfile = await this.profileService.getProfile(otherId);
          return { match, otherProfile };
        })
      );
      this.matches.set(withProfiles);
    } catch {
      this.toast.error('Error al cargar matches');
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

  getCompatibility(score: number): number {
    return Math.round(score * 100);
  }

  getMatchDate(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString('es-PE', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  async openExplain(item: MatchWithProfile): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    this.explainTarget.set(item);
    this.explainResult.set(null);
    this.explainLoading.set(true);
    try {
      const otherId = item.match.user_a_id === user.$id ? item.match.user_b_id : item.match.user_a_id;
      const result = await this.matchService.explainCompatibility(user.$id, otherId);
      this.explainResult.set(result);
    } catch {
      this.toast.error('No se pudo obtener la explicación');
      this.explainTarget.set(null);
    } finally {
      this.explainLoading.set(false);
    }
  }

  closeExplain(): void {
    this.explainTarget.set(null);
    this.explainResult.set(null);
  }

  getDimColor(score: number): string {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-violet-500';
    if (score >= 25) return 'bg-amber-400';
    return 'bg-red-400';
  }
}

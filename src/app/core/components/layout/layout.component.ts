import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatchService } from '../../services/match.service';
import { NotificationService, NotifItem } from '../../services/notification.service';
import { OnboardingComponent } from '../onboarding/onboarding.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, OnboardingComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit, OnDestroy {

  showNotifications = signal(false);
  showOnboarding    = signal(false);

  private pollInterval?: ReturnType<typeof setInterval>;
  private knownMessageIds = new Set<string>();
  private matchIds: string[] = [];

  constructor(
    public auth: AuthService,
    public notifications: NotificationService,
    private matchService: MatchService,
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    try {
      const matches = await this.matchService.getMyMatches(user.$id);
      this.matchIds = matches.map((m: any) => m.$id);
      this.notifications.init(user.$id, this.matchIds);

      // Cargar IDs ya conocidos para no notificar mensajes viejos
      await this.loadKnownMessageIds();
    } catch {
      this.notifications.init(user.$id, []);
    }

    // Polling de notificaciones cada 5s (fallback para cuando Realtime no funciona)
    this.pollInterval = setInterval(() => this.pollNotifications(), 5000);

    // Onboarding: mostrar solo la primera vez por usuario
    const key = `onboarding_done_${user.$id}`;
    if (!localStorage.getItem(key)) {
      this.showOnboarding.set(true);
    }
  }

  onboardingDone(): void {
    const user = this.auth.currentUser();
    if (user) localStorage.setItem(`onboarding_done_${user.$id}`, '1');
    this.showOnboarding.set(false);
  }

  private async loadKnownMessageIds(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;
    for (const matchId of this.matchIds) {
      try {
        const msgs = await this.matchService.getMessages(matchId);
        msgs.forEach(m => this.knownMessageIds.add(m.$id));
      } catch { /* ignorar */ }
    }
  }

  private async pollNotifications(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user || this.matchIds.length === 0) return;

    for (const matchId of this.matchIds) {
      try {
        const msgs = await this.matchService.getMessages(matchId);
        for (const msg of msgs) {
          if (!this.knownMessageIds.has(msg.$id)) {
            this.knownMessageIds.add(msg.$id);
            // Solo notificar mensajes de otros y fuera del chat activo
            if (msg.sender_id !== user.$id) {
              this.notifications.addPollNotification(msg.$id, matchId, msg.content, msg.$createdAt);
            }
          }
        }
      } catch { /* ignorar */ }
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.pollInterval);
    this.notifications.destroy();
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  onNotifClick(notif: NotifItem): void {
    this.notifications.markMatchRead(notif.matchId);
    this.showNotifications.set(false);
  }

  formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `hace ${diffH}h`;
    return `hace ${Math.floor(diffH / 24)}d`;
  }

  async onLogout(): Promise<void> {
    await this.auth.logout();
  }
}

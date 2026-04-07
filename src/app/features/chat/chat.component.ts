import { Component, signal, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MatchService } from '../../core/services/match.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { Match, Message } from '../../core/models/match.model';
import { UserProfile } from '../../core/models/user-profile.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  isLoading    = signal(true);
  isSending    = signal(false);
  match        = signal<Match | null>(null);
  otherProfile = signal<UserProfile | null>(null);
  messages     = signal<Message[]>([]);
  newMessage   = '';

  private shouldScroll  = false;
  private pollInterval?: ReturnType<typeof setInterval>;
  private matchId       = '';

  private readonly AVATAR_COLORS = [
    'bg-pink-400', 'bg-blue-400', 'bg-emerald-400',
    'bg-amber-400', 'bg-violet-400', 'bg-rose-400',
    'bg-cyan-400',  'bg-orange-400',
  ];

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private matchService: MatchService,
    private profileService: ProfileService,
    private toast: ToastService,
    private notificationService: NotificationService,
  ) {}

  async ngOnInit(): Promise<void> {
    const matchId = this.route.snapshot.paramMap.get('matchId');
    const user    = this.auth.currentUser();
    if (!matchId || !user) return;

    this.matchId = matchId;

    try {
      const [match, msgs] = await Promise.all([
        this.matchService.getMatch(matchId),
        this.matchService.getMessages(matchId),
      ]);
      this.match.set(match);
      this.messages.set(msgs);

      const otherId = match.user_a_id === user.$id ? match.user_b_id : match.user_a_id;
      this.otherProfile.set(await this.profileService.getProfile(otherId));

      msgs
        .filter(m => m.sender_id !== user.$id && !m.is_read)
        .forEach(m => this.matchService.markAsRead(m.$id));

      this.notificationService.markMatchRead(matchId);

      // Realtime (funciona si el WebSocket está activo)
      this.notificationService.setChatListener(matchId, (msg) => {
        this.addMessage(msg);
      });

      // Polling fallback cada 3s — garantiza llegada de mensajes
      this.pollInterval = setInterval(() => this.pollMessages(), 3000);

      this.shouldScroll = true;
    } catch {
      this.toast.error('Error al cargar el chat');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async pollMessages(): Promise<void> {
    const matchId = this.matchId;
    if (!matchId) return;
    try {
      const fresh = await this.matchService.getMessages(matchId);
      fresh.forEach(msg => this.addMessage(msg));
    } catch { /* silencioso */ }
  }

  private addMessage(msg: Message): void {
    this.messages.update(list => {
      if (list.some(m => m.$id === msg.$id)) return list;
      this.shouldScroll = true;
      return [...list, msg];
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.notificationService.clearChatListener();
    clearInterval(this.pollInterval);
  }

  async send(): Promise<void> {
    const content = this.newMessage.trim();
    const match   = this.match();
    const user    = this.auth.currentUser();
    if (!content || !match || !user || this.isSending()) return;

    this.isSending.set(true);
    this.newMessage = '';
    try {
      const msg = await this.matchService.sendMessage(match.$id, user.$id, content);
      this.addMessage(msg);
    } catch {
      this.toast.error('Error al enviar mensaje');
      this.newMessage = content;
    } finally {
      this.isSending.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }

  isMe(senderId: string): boolean {
    return senderId === this.auth.currentUser()?.$id;
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

  formatTime(createdAt: string): string {
    return new Date(createdAt).toLocaleTimeString('es-PE', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  isSameDay(a: string, b: string): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString();
  }

  formatDateLabel(createdAt: string): string {
    const d = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  }
}

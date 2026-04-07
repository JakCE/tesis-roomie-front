import { Injectable, signal, computed, NgZone } from '@angular/core';
import { AppwriteService } from './appwrite.service';
import { DB_ID, COLLECTIONS } from '../appwrite.constants';

export interface NotifItem {
  id:        string;
  type:      'message' | 'match';
  matchId:   string;
  preview:   string;
  timestamp: string;
  read:      boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private _items = signal<NotifItem[]>([]);
  readonly items       = this._items.asReadonly();
  readonly unreadCount = computed(() => this._items().filter(n => !n.read).length);

  private unsubs: Array<() => void> = [];
  private currentUserId   = '';
  private userMatchIds    = new Set<string>();
  private chatCallback:   ((msg: any) => void) | null = null;
  private activeChatMatch = '';

  constructor(private appwrite: AppwriteService, private ngZone: NgZone) {}

  setChatListener(matchId: string, callback: (msg: any) => void): void {
    this.activeChatMatch = matchId;
    this.chatCallback    = callback;
  }

  clearChatListener(): void {
    this.chatCallback    = null;
    this.activeChatMatch = '';
  }

  init(userId: string, matchIds: string[]): void {
    if (this.currentUserId === userId) {
      matchIds.forEach(id => this.userMatchIds.add(id));
      return;
    }
    this.currentUserId = userId;
    this.userMatchIds  = new Set(matchIds);
    this.subscribeMessages();
    this.subscribeMatches();
  }

  addMatchId(matchId: string): void {
    this.userMatchIds.add(matchId);
  }

  addPollNotification(msgId: string, matchId: string, preview: string, timestamp: string): void {
    if (matchId === this.activeChatMatch) return;
    this._items.update(list => {
      if (list.some(n => n.id === msgId)) return list;
      return [{
        id:        msgId,
        type:      'message' as const,
        matchId,
        preview:   preview?.slice(0, 60) ?? 'Nuevo mensaje',
        timestamp,
        read:      false,
      }, ...list].slice(0, 30);
    });
  }

  private subscribeMessages(): void {
    const unsub = this.appwrite.client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response: any) => {
        console.log('[WS] raw event received');
        if (!response.events?.some((e: string) => e.includes('.create'))) return;
        const msg = response.payload;

        this.ngZone.run(() => {
          // Rutear al chat activo (sender y receptor)
          if (this.chatCallback && msg.match_id === this.activeChatMatch) {
            this.chatCallback(msg);
          }

          // Notificación: solo mensajes de otros, fuera del chat activo
          if (msg.sender_id === this.currentUserId) return;
          if (msg.match_id === this.activeChatMatch) return;

          this._items.update(list => [{
            id:        msg.$id,
            type:      'message' as const,
            matchId:   msg.match_id,
            preview:   msg.content?.slice(0, 60) ?? 'Nuevo mensaje',
            timestamp: msg.$createdAt,
            read:      false,
          }, ...list].slice(0, 30));
        });
      }
    );
    this.unsubs.push(unsub);
  }

  private subscribeMatches(): void {
    const unsub = this.appwrite.client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTIONS.MATCHES}.documents`,
      (response: any) => {
        if (!response.events?.some((e: string) => e.includes('.create'))) return;
        const match = response.payload;
        if (match.user_a_id !== this.currentUserId && match.user_b_id !== this.currentUserId) return;

        this.ngZone.run(() => {
          this.userMatchIds.add(match.$id);
          this._items.update(list => [{
            id:        match.$id,
            type:      'match' as const,
            matchId:   match.$id,
            preview:   '¡Nuevo match!',
            timestamp: match.$createdAt,
            read:      false,
          }, ...list].slice(0, 30));
        });
      }
    );
    this.unsubs.push(unsub);
  }

  markMatchRead(matchId: string): void {
    this._items.update(list =>
      list.map(n => n.matchId === matchId ? { ...n, read: true } : n)
    );
  }

  markAllRead(): void {
    this._items.update(list => list.map(n => ({ ...n, read: true })));
  }

  destroy(): void {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
    this._items.set([]);
    this.currentUserId = '';
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ID, Query, Permission, Role } from 'appwrite';
import { firstValueFrom } from 'rxjs';
import { AppwriteService } from './appwrite.service';
import { DB_ID, COLLECTIONS } from '../appwrite.constants';
import { Match, Message } from '../models/match.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatchService {

  constructor(
    private appwrite: AppwriteService,
    private http: HttpClient,
  ) {}

  // Crear match cuando hay like mutuo
  async createMatch(
    userAId: string,
    userBId: string,
    compatibilityScore: number
  ): Promise<Match> {
    return firstValueFrom(
      this.http.post<Match>(`${environment.apiUrl}/matches/`, {
        user_a_id:           userAId,
        user_b_id:           userBId,
        compatibility_score: compatibilityScore,
      })
    );
  }

  // Obtener todos los matches del usuario
  async getMyMatches(userId: string): Promise<Match[]> {
    const [resA, resB] = await Promise.all([
      this.appwrite.databases.listDocuments(
        DB_ID,
        COLLECTIONS.MATCHES,
        [
          Query.equal('user_a_id', userId),
          Query.equal('status', 'active'),
        ]
      ),
      this.appwrite.databases.listDocuments(
        DB_ID,
        COLLECTIONS.MATCHES,
        [
          Query.equal('user_b_id', userId),
          Query.equal('status', 'active'),
        ]
      ),
    ]);
    return [
      ...resA.documents,
      ...resB.documents,
    ] as unknown as Match[];
  }

  // Obtener un match por ID
  async getMatch(matchId: string): Promise<Match> {
    const doc = await this.appwrite.databases.getDocument(
      DB_ID,
      COLLECTIONS.MATCHES,
      matchId
    );
    return doc as unknown as Match;
  }

  // Enviar mensaje en un match
  async sendMessage(
    matchId: string,
    senderId: string,
    content: string
  ): Promise<Message> {
    const doc = await this.appwrite.databases.createDocument(
      DB_ID,
      COLLECTIONS.MESSAGES,
      ID.unique(),
      {
        match_id:  matchId,
        sender_id: senderId,
        content,
        type:      'text',
        is_read:   false,
      },
      [
        Permission.read(Role.users()),
        Permission.update(Role.user(senderId)),
        Permission.delete(Role.user(senderId)),
      ]
    );
    return doc as unknown as Message;
  }

  // Obtener mensajes de un match ordenados por fecha
  async getMessages(matchId: string): Promise<Message[]> {
    const res = await this.appwrite.databases.listDocuments(
      DB_ID,
      COLLECTIONS.MESSAGES,
      [
        Query.equal('match_id', matchId),
        Query.orderAsc('$createdAt'),
        Query.limit(100),
      ]
    );
    return res.documents as unknown as Message[];
  }

  // Suscripción realtime a mensajes nuevos
  subscribeToMessages(matchId: string, callback: (message: Message) => void) {
    return this.appwrite.client.subscribe(
      `databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      (response: any) => {
        if (
          response.events.includes('databases.*.collections.*.documents.*.create') &&
          response.payload.match_id === matchId
        ) {
          callback(response.payload as Message);
        }
      }
    );
  }

  // Explicación IA de compatibilidad
  explainCompatibility(userAId: string, userBId: string) {
    return firstValueFrom(
      this.http.get<{
        explanation: string;
        total_score: number;
        dimensions: { name: string; score: number; weight: number }[];
      }>(`${environment.apiUrl}/explain/${userAId}/${userBId}`)
    );
  }

  // Marcar mensajes como leídos
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.appwrite.databases.updateDocument(
        DB_ID,
        COLLECTIONS.MESSAGES,
        messageId,
        { is_read: true }
      );
    } catch { /* sin permisos de update — ignorar */ }
  }
}
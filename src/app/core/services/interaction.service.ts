import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ID, Query } from 'appwrite';
import { firstValueFrom } from 'rxjs';
import { AppwriteService } from './appwrite.service';
import { DB_ID, COLLECTIONS } from '../appwrite.constants';
import { Interaction } from '../models/match.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InteractionService {

  constructor(
    private appwrite: AppwriteService,
    private http: HttpClient,
  ) {}

  // Registrar like/dislike/skip
  async createInteraction(
    fromUserId: string,
    toUserId: string,
    action: 'like' | 'dislike' | 'skip'
  ): Promise<Interaction> {
    return firstValueFrom(
      this.http.post<Interaction>(`${environment.apiUrl}/interactions/`, {
        from_user_id: fromUserId,
        to_user_id:   toUserId,
        action,
      })
    );
  }

  // Obtener todas las interacciones del usuario actual
  async getMyInteractions(userId: string): Promise<Interaction[]> {
    const res = await this.appwrite.databases.listDocuments(
      DB_ID,
      COLLECTIONS.INTERACTIONS,
      [
        Query.equal('from_user_id', userId),
        Query.limit(100),
      ]
    );
    return res.documents as unknown as Interaction[];
  }

  // Obtener solo los likes del usuario (para detectar match)
  async getMyLikes(userId: string): Promise<Interaction[]> {
    const res = await this.appwrite.databases.listDocuments(
      DB_ID,
      COLLECTIONS.INTERACTIONS,
      [
        Query.equal('from_user_id', userId),
        Query.equal('action', 'like'),
      ]
    );
    return res.documents as unknown as Interaction[];
  }

  // Verificar si el otro usuario ya dio like (para crear match)
  async checkMutualLike(fromUserId: string, toUserId: string): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.get<{ mutual: boolean }>(
        `${environment.apiUrl}/interactions/mutual/${fromUserId}/${toUserId}`
      )
    );
    return res.mutual;
  }

  // Obtener IDs de usuarios ya vistos (para excluirlos del feed)
  async getSeenUserIds(userId: string): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.get<{ user_ids: string[] }>(
        `${environment.apiUrl}/interactions/seen/${userId}`
      )
    );
    return res.user_ids;
  }
}
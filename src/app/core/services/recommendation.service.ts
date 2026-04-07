import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProfileService } from './profile.service';
import { UserProfile } from '../models/user-profile.model';

interface ApiRecommendationResult {
  user_id:       string;
  content_score: number;
  collab_score:  number;
  hybrid_score:  number;
  alpha_used:    number;
}

export interface RecommendedProfile {
  profile:       UserProfile;
  content_score: number;
  collab_score:  number;
  hybrid_score:  number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {

  constructor(
    private http: HttpClient,
    private profileService: ProfileService,
  ) {}

  async getRecommendations(userId: string, limit = 10): Promise<RecommendedProfile[]> {
    let apiResults: ApiRecommendationResult[] = [];

    try {
      apiResults = await firstValueFrom(
        this.http.post<ApiRecommendationResult[]>(
          `${environment.apiUrl}/recommendations/`,
          { user_id: userId, limit }
        )
      );
      console.log('[RecommendationService] FastAPI response:', apiResults);
    } catch (err) {
      console.warn('[RecommendationService] FastAPI no disponible, usando fallback Appwrite:', err);
    }

    if (apiResults.length === 0) return [];

    const settled = await Promise.allSettled(
      apiResults.map(r => this.profileService.getProfile(r.user_id))
    );
    const combined: RecommendedProfile[] = [];
    apiResults.forEach((r, i) => {
      const res = settled[i];
      if (res.status === 'fulfilled') {
        combined.push({
          profile:       res.value,
          content_score: r.content_score,
          collab_score:  r.collab_score,
          hybrid_score:  r.hybrid_score,
        });
      }
    });
    return combined;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserWeights {
  w_budget:      number;
  w_zone:        number;
  w_schedule:    number;
  w_cleanliness: number;
  w_noise:       number;
  w_pets:        number;
  w_smoking:     number;
  w_age:         number;
  w_gender:      number;
}

export const DEFAULT_WEIGHTS: UserWeights = {
  w_budget:      0.20,
  w_zone:        0.20,
  w_schedule:    0.15,
  w_cleanliness: 0.15,
  w_noise:       0.10,
  w_pets:        0.05,
  w_smoking:     0.05,
  w_age:         0.05,
  w_gender:      0.05,
};

@Injectable({ providedIn: 'root' })
export class WeightsService {
  constructor(private http: HttpClient) {}

  async getWeights(userId: string): Promise<UserWeights> {
    try {
      return await firstValueFrom(
        this.http.get<UserWeights>(`${environment.apiUrl}/weights/${userId}`)
      );
    } catch {
      return { ...DEFAULT_WEIGHTS };
    }
  }

  async saveWeights(userId: string, weights: UserWeights): Promise<UserWeights> {
    const res = await firstValueFrom(
      this.http.put<{ weights: UserWeights }>(`${environment.apiUrl}/weights/${userId}`, weights)
    );
    return res.weights;
  }
}

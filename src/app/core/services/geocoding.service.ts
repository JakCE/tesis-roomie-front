import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  constructor(private http: HttpClient) {}

  async getCoordinates(zone: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const query = encodeURIComponent(`${zone}, Lima, Peru`);
      const url   = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
      const results = await firstValueFrom(
        this.http.get<NominatimResult[]>(url, {
          headers: { 'Accept-Language': 'es' }
        })
      );
      if (!results || results.length === 0) return null;
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    } catch {
      return null;
    }
  }
}
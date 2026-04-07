import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ID, Models } from 'appwrite';
import { AppwriteService } from './appwrite.service';
import { ProfileService } from './profile.service';
import { UserProfile } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<Models.User<Models.Preferences> | null>(null);
  isLoading   = signal<boolean>(false);

  constructor(
    private appwrite: AppwriteService,
    private profile: ProfileService,
    private router: Router
  ) {
    this.checkSession();
  }

  async checkSession(): Promise<void> {
    try {
      const user = await this.appwrite.account.get();
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }

  async register(
    email: string,
    password: string,
    name: string,
    profileData: Partial<UserProfile>
  ): Promise<void> {
    this.isLoading.set(true);
    try {
      const userId = ID.unique();
      await this.appwrite.account.create(userId, email, password, name);
      await this.appwrite.account.createEmailPasswordSession(email, password);
      const user = await this.appwrite.account.get();
      this.currentUser.set(user);
      await Promise.all([
        this.profile.createProfile(user.$id, profileData),
        this.profile.createDefaultWeights(user.$id),
      ]);
      this.router.navigate(['/dashboard']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.appwrite.account.createEmailPasswordSession(email, password);
      const user = await this.appwrite.account.get();
      this.currentUser.set(user);
      this.router.navigate(['/dashboard']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.appwrite.account.deleteSession('current');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  async getSession(): Promise<boolean> {
    try {
        const user = await this.appwrite.account.get();
        this.currentUser.set(user);
        return true;
    } catch {
        this.currentUser.set(null);
        return false;
    }
  }
}
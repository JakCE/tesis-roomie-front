import { Injectable } from '@angular/core';
import { ID, Permission, Role, Query } from 'appwrite';
import { AppwriteService } from './appwrite.service';
import { DB_ID, COLLECTIONS } from '../appwrite.constants';
import { UserProfile, UserPreferenceWeights } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  constructor(private appwrite: AppwriteService) {}

  async createProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const doc = await this.appwrite.databases.createDocument(
      DB_ID,
      COLLECTIONS.USER_PROFILES,
      userId,
      { ...data, user_id: userId },
      [
        Permission.read(Role.users()),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );
    return doc as unknown as UserProfile;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const doc = await this.appwrite.databases.getDocument(
      DB_ID,
      COLLECTIONS.USER_PROFILES,
      userId
    );
    return doc as unknown as UserProfile;
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const doc = await this.appwrite.databases.updateDocument(
      DB_ID,
      COLLECTIONS.USER_PROFILES,
      userId,
      data
    );
    return doc as unknown as UserProfile;
  }

  async getVisibleProfiles(userId: string): Promise<UserProfile[]> {
    const res = await this.appwrite.databases.listDocuments(
      DB_ID,
      COLLECTIONS.USER_PROFILES,
      [
        Query.equal('is_visible', true),
        Query.notEqual('$id', userId),
        Query.limit(50),
      ]
    );
    return res.documents as unknown as UserProfile[];
  }

  async createDefaultWeights(userId: string): Promise<UserPreferenceWeights> {
    const defaults = {
      user_id:       userId,
      w_budget:      0.20,
      w_zone:        0.20,
      w_schedule:    0.15,
      w_cleanliness: 0.15,
      w_noise:       0.10,
      w_pets:        0.05,
      w_smoking:     0.05,
      w_age:         0.05,
      w_gender:      0.05,
      alpha:         0.70,
    };
    const doc = await this.appwrite.databases.createDocument(
      DB_ID,
      COLLECTIONS.USER_PREFERENCE_WEIGHTS,
      ID.unique(),
      defaults,
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );
    return doc as unknown as UserPreferenceWeights;
  }

  async getWeights(userId: string): Promise<UserPreferenceWeights> {
    const res = await this.appwrite.databases.listDocuments(
      DB_ID,
      COLLECTIONS.USER_PREFERENCE_WEIGHTS,
      [Query.equal('user_id', userId)]
    );
    return res.documents[0] as unknown as UserPreferenceWeights;
  }

  async updateWeights(docId: string, data: Partial<UserPreferenceWeights>): Promise<UserPreferenceWeights> {
    const doc = await this.appwrite.databases.updateDocument(
      DB_ID,
      COLLECTIONS.USER_PREFERENCE_WEIGHTS,
      docId,
      data
    );
    return doc as unknown as UserPreferenceWeights;
  }
}
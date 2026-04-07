import { Injectable } from '@angular/core';
import { Client, Databases, Account, Storage } from 'appwrite';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppwriteService {
  client:    Client;
  databases: Databases;
  account:   Account;
  storage:   Storage;

  constructor() {
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);

    this.databases = new Databases(this.client);
    this.account   = new Account(this.client);
    this.storage   = new Storage(this.client);
  }
}
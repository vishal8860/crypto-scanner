import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HealthStatus } from '../../shared/models/health-status.interface';

@Injectable({ providedIn: 'root' })
export class HealthApiService { private readonly http = inject(HttpClient); getStatus(): Observable<HealthStatus> { return this.http.get<HealthStatus>('/api/v1/health'); } }

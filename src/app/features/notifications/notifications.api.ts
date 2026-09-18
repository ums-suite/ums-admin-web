import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  CreateNotificationTemplateRequest,
  NotificationTemplateDto,
  NotificationTemplatePage,
  UpdateNotificationTemplateRequest,
} from './notifications.types';

/**
 * ADMIN-35: hand-rolled thin client for `ums-core`'s Notifications module -- see
 * `notifications.types.ts`'s own doc for the confirmed real idempotent-create/upsert-translation
 * shape and the SMS/WhatsApp/Email/Push validation rules mirrored client-side.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/notifications`;
  }

  listTemplates(skip = 0, take = 50): Observable<NotificationTemplatePage> {
    const params = new HttpParams().set('skip', skip).set('take', take);
    return this.http.get<NotificationTemplatePage>(`${this.baseUrl}/templates`, { params });
  }

  /** Idempotent get-or-create by the natural key `(EventType, Channel)`. */
  createTemplate(request: CreateNotificationTemplateRequest): Observable<NotificationTemplateDto> {
    return this.http.post<NotificationTemplateDto>(`${this.baseUrl}/templates`, request);
  }

  /** Upserts exactly one language's translation, bumping Version. */
  updateTemplate(
    id: string,
    request: UpdateNotificationTemplateRequest,
  ): Observable<NotificationTemplateDto> {
    return this.http.put<NotificationTemplateDto>(`${this.baseUrl}/templates/${id}`, request);
  }
}

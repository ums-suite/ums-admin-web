import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AddEventTranslationRequest,
  AddNoticeTranslationRequest,
  BannerDto,
  CreateBannerRequest,
  CreateEventRequest,
  CreateNoticeRequest,
  EventDto,
  EventQuery,
  NoticeDto,
  NoticeFeedQuery,
  NoticeTranslationDto,
  SetBannerScheduleRequest,
  SetNoticeScheduleRequest,
  TransitionBannerRequest,
  TransitionNoticeRequest,
  UpdateBannerRequest,
  UpdateEventRequest,
  UpdateNoticeRequest,
} from './content.types';

/**
 * ADMIN-30: hand-rolled thin client for `ums-core`'s Content module -- see `content.types.ts`'s
 * own doc for the confirmed real translation-table model, per-call `Version` requirement, and the
 * Event/Banner scope differences (no schedule/publish/archive for Event; no translations at all
 * for Banner).
 */
@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/content`;
  }

  // ---- Notice ----

  getNoticeFeed(query: NoticeFeedQuery): Observable<readonly NoticeDto[]> {
    let params = new HttpParams();
    if (query.audience) params = params.set('audience', query.audience);
    if (query.skip !== undefined) params = params.set('skip', query.skip);
    if (query.take !== undefined) params = params.set('take', query.take);
    return this.http.get<readonly NoticeDto[]>(`${this.baseUrl}/notices/feed`, { params });
  }

  getNotice(id: string): Observable<NoticeDto> {
    return this.http.get<NoticeDto>(`${this.baseUrl}/notices/${id}`);
  }

  createNotice(request: CreateNoticeRequest): Observable<NoticeDto> {
    return this.http.post<NoticeDto>(`${this.baseUrl}/notices`, request);
  }

  updateNotice(id: string, request: UpdateNoticeRequest): Observable<NoticeDto> {
    return this.http.put<NoticeDto>(`${this.baseUrl}/notices/${id}`, request);
  }

  addNoticeTranslation(
    id: string,
    request: AddNoticeTranslationRequest,
  ): Observable<NoticeTranslationDto> {
    return this.http.post<NoticeTranslationDto>(
      `${this.baseUrl}/notices/${id}/translations`,
      request,
    );
  }

  setNoticeSchedule(id: string, request: SetNoticeScheduleRequest): Observable<NoticeDto> {
    return this.http.put<NoticeDto>(`${this.baseUrl}/notices/${id}/schedule`, request);
  }

  /** Draft -> Scheduled transition. */
  scheduleNotice(id: string, request: TransitionNoticeRequest): Observable<NoticeDto> {
    return this.http.post<NoticeDto>(`${this.baseUrl}/notices/${id}/schedule`, request);
  }

  publishNotice(id: string, request: TransitionNoticeRequest): Observable<NoticeDto> {
    return this.http.post<NoticeDto>(`${this.baseUrl}/notices/${id}/publish`, request);
  }

  /** Gated by `content.notice.publish`, not a separate archive permission. */
  archiveNotice(id: string, request: TransitionNoticeRequest): Observable<NoticeDto> {
    return this.http.post<NoticeDto>(`${this.baseUrl}/notices/${id}/archive`, request);
  }

  // ---- Event -- no schedule/publish/archive/delete exists ----

  listEvents(query: EventQuery): Observable<readonly EventDto[]> {
    let params = new HttpParams();
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.audience) params = params.set('audience', query.audience);
    if (query.organizationNodeId)
      params = params.set('organizationNodeId', query.organizationNodeId);
    if (query.skip !== undefined) params = params.set('skip', query.skip);
    if (query.take !== undefined) params = params.set('take', query.take);
    return this.http.get<readonly EventDto[]>(`${this.baseUrl}/events`, { params });
  }

  getEvent(id: string): Observable<EventDto> {
    return this.http.get<EventDto>(`${this.baseUrl}/events/${id}`);
  }

  createEvent(request: CreateEventRequest): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.baseUrl}/events`, request);
  }

  updateEvent(id: string, request: UpdateEventRequest): Observable<EventDto> {
    return this.http.put<EventDto>(`${this.baseUrl}/events/${id}`, request);
  }

  addEventTranslation(id: string, request: AddEventTranslationRequest): Observable<EventDto> {
    return this.http.post<EventDto>(`${this.baseUrl}/events/${id}/translations`, request);
  }

  // ---- Banner -- no translations at all ----

  listBanners(): Observable<readonly BannerDto[]> {
    return this.http.get<readonly BannerDto[]>(`${this.baseUrl}/banners`);
  }

  getBanner(id: string): Observable<BannerDto> {
    return this.http.get<BannerDto>(`${this.baseUrl}/banners/${id}`);
  }

  createBanner(request: CreateBannerRequest): Observable<BannerDto> {
    return this.http.post<BannerDto>(`${this.baseUrl}/banners`, request);
  }

  updateBanner(id: string, request: UpdateBannerRequest): Observable<BannerDto> {
    return this.http.put<BannerDto>(`${this.baseUrl}/banners/${id}`, request);
  }

  setBannerSchedule(id: string, request: SetBannerScheduleRequest): Observable<BannerDto> {
    return this.http.put<BannerDto>(`${this.baseUrl}/banners/${id}/schedule`, request);
  }

  scheduleBanner(id: string, request: TransitionBannerRequest): Observable<BannerDto> {
    return this.http.post<BannerDto>(`${this.baseUrl}/banners/${id}/schedule`, request);
  }

  publishBanner(id: string, request: TransitionBannerRequest): Observable<BannerDto> {
    return this.http.post<BannerDto>(`${this.baseUrl}/banners/${id}/publish`, request);
  }

  /** Gated by `content.banner.publish`, the same permission as publish. */
  archiveBanner(id: string, request: TransitionBannerRequest): Observable<BannerDto> {
    return this.http.post<BannerDto>(`${this.baseUrl}/banners/${id}/archive`, request);
  }
}

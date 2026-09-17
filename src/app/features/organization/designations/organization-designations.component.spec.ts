import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { OrganizationDesignationsComponent } from './organization-designations.component';

describe('OrganizationDesignationsComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';
  const emptyPage = { items: [], totalCount: 0, skip: 0, take: 100 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationDesignationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    const fixture = TestBed.createComponent(OrganizationDesignationsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/designations`)
      .flush({
        items: [
          {
            id: 'd1',
            title: 'Lecturer',
            localizedTitle: 'Lecturer',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        totalCount: 1,
        skip: 0,
        take: 100,
      });
    fixture.detectChanges();
    return fixture;
  }

  it('loads designations on init and renders them', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('Lecturer');
  });

  it('does not submit with a blank title', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateModal']();
    fixture.componentInstance['createTitle'].set('   ');
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('creates a designation and reloads the list', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateModal']();
    fixture.componentInstance['createTitle'].set('Registrar');
    fixture.componentInstance['submitCreate']();

    const req = httpMock.expectOne(
      (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/designations`,
    );
    expect(req.request.body).toEqual({ title: 'Registrar', translations: null });
    req.flush({
      id: 'd2',
      title: 'Registrar',
      localizedTitle: 'Registrar',
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/designations`)
      .flush(emptyPage);

    expect(fixture.componentInstance['createModalOpen']()).toBeFalse();
  });
});

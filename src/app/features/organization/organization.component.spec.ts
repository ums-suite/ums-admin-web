import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { OrganizationComponent } from './organization.component';

describe('OrganizationComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';
  const emptyPage = { items: [], totalCount: 0, skip: 0, take: 100 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the Hierarchy tab by default and loads universities', () => {
    const fixture = TestBed.createComponent(OrganizationComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush(emptyPage);
    expect(fixture.nativeElement.textContent).toContain('Organization');
  });

  it('switching to the Designations tab loads the designation catalog', () => {
    const fixture = TestBed.createComponent(OrganizationComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush(emptyPage);

    fixture.componentInstance['onTabChange'](1);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/designations`)
      .flush(emptyPage);
    expect(fixture.componentInstance['selectedTabIndex']()).toBe(1);
  });

  it('switching to the Buildings & Rooms tab loads buildings', () => {
    const fixture = TestBed.createComponent(OrganizationComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush(emptyPage);

    fixture.componentInstance['onTabChange'](2);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings`)
      .flush(emptyPage);
    expect(fixture.componentInstance['selectedTabIndex']()).toBe(2);
  });
});

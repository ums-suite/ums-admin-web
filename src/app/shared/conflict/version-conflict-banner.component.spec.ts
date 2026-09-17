import { TestBed } from '@angular/core/testing';
import { VersionConflictBannerComponent } from './version-conflict-banner.component';

describe('VersionConflictBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionConflictBannerComponent],
    }).compileComponents();
  });

  it('renders the default message when none is provided', () => {
    const fixture = TestBed.createComponent(VersionConflictBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('changed by someone else');
  });

  it('renders a custom message', () => {
    const fixture = TestBed.createComponent(VersionConflictBannerComponent);
    fixture.componentRef.setInput('message', 'Custom conflict message');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Custom conflict message');
  });

  it('lists changed fields when provided', () => {
    const fixture = TestBed.createComponent(VersionConflictBannerComponent);
    fixture.componentRef.setInput('changedFields', ['status', 'departmentId']);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.app-version-conflict-banner__fields li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('status');
  });

  it('emits reload when the reload button is activated', () => {
    const fixture = TestBed.createComponent(VersionConflictBannerComponent);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.reload.subscribe(() => (emitted = true));

    fixture.nativeElement.querySelector('ums-button').dispatchEvent(new Event('click'));

    expect(emitted).toBeTrue();
  });
});

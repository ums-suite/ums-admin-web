import { TestBed } from '@angular/core/testing';
import { PermissionRevokedBannerComponent } from './permission-revoked-banner.component';

describe('PermissionRevokedBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionRevokedBannerComponent],
    }).compileComponents();
  });

  it('renders the default action label in its message', () => {
    const fixture = TestBed.createComponent(PermissionRevokedBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('this action');
    expect(fixture.nativeElement.textContent).toContain('was revoked');
  });

  it('renders a custom action label', () => {
    const fixture = TestBed.createComponent(PermissionRevokedBannerComponent);
    fixture.componentRef.setInput('actionLabel', 'publishing this result');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('publishing this result');
  });

  it('emits leave when the leave button is activated', () => {
    const fixture = TestBed.createComponent(PermissionRevokedBannerComponent);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.leave.subscribe(() => (emitted = true));

    fixture.nativeElement.querySelector('ums-button').dispatchEvent(new Event('click'));

    expect(emitted).toBeTrue();
  });
});

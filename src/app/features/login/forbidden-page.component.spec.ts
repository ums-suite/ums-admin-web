import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForbiddenPageComponent } from './forbidden-page.component';

describe('ForbiddenPageComponent', () => {
  it('renders', async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ForbiddenPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("don't have access");
  });
});

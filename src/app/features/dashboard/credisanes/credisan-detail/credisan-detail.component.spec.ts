import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredisanDetailComponent } from './credisan-detail.component';

describe('CredisanDetailComponent', () => {
  let component: CredisanDetailComponent;
  let fixture: ComponentFixture<CredisanDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CredisanDetailComponent]
    });
    fixture = TestBed.createComponent(CredisanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredisanesComponent } from './credisanes.component';

describe('CredisanesComponent', () => {
  let component: CredisanesComponent;
  let fixture: ComponentFixture<CredisanesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CredisanesComponent]
    });
    fixture = TestBed.createComponent(CredisanesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

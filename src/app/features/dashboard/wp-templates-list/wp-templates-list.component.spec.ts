import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpTemplatesListComponent } from './wp-templates-list.component';

describe('WpTemplatesListComponent', () => {
  let component: WpTemplatesListComponent;
  let fixture: ComponentFixture<WpTemplatesListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WpTemplatesListComponent]
    });
    fixture = TestBed.createComponent(WpTemplatesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

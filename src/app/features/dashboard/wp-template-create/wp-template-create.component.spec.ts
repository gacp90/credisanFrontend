import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpTemplateCreateComponent } from './wp-template-create.component';

describe('WpTemplateCreateComponent', () => {
  let component: WpTemplateCreateComponent;
  let fixture: ComponentFixture<WpTemplateCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WpTemplateCreateComponent]
    });
    fixture = TestBed.createComponent(WpTemplateCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

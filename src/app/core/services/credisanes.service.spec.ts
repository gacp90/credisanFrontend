import { TestBed } from '@angular/core/testing';

import { CredisanesService } from './credisanes.service';

describe('CredisanesService', () => {
  let service: CredisanesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredisanesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { SpidiService } from './spidi.service';

describe('SpidiService', () => {
  let service: SpidiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpidiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

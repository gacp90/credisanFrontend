import { TestBed } from '@angular/core/testing';

import { TenantClientsService } from './tenant-clients.service';

describe('TenantClientsService', () => {
  let service: TenantClientsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantClientsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

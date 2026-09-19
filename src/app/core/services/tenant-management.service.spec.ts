import { TestBed } from '@angular/core/testing';

import { TenantManagementService } from './tenant-management.service';

describe('TenantManagementService', () => {
  let service: TenantManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

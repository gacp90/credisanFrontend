import { TestBed } from '@angular/core/testing';

import { WhatsappTemplatesService } from './whatsapp-templates.service';

describe('WhatsappTemplatesService', () => {
  let service: WhatsappTemplatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsappTemplatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

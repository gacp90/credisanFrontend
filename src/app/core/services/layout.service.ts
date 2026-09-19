import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private isSidebarOpen = new BehaviorSubject<boolean>(false);
  isSidebarOpen$ = this.isSidebarOpen.asObservable();

  toggleSidebar() {
    this.isSidebarOpen.next(!this.isSidebarOpen.value);
  }

  closeSidebar() {
    this.isSidebarOpen.next(false);
  }
}
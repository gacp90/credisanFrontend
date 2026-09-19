import { Routes } from '@angular/router';
import { MainLayoutComponent } from '../../core/layouts/main-layout/main-layout.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: MainLayoutComponent, // El layout maestro whatsapp-settings
    children: [
      {
        path: 'clientes',
        loadComponent: () => import('./clientes/clientes.component').then(c => c.ClientesComponent)
      },
      { path: 'empresas', loadComponent: () => import('./empresas/empresas.component').then(c => c.EmpresasComponent) },
      { path: 'sanes', loadComponent: () => import('./credisanes/credisanes.component').then(c => c.CredisanesComponent) },
      { path: 'sanes/:id', loadComponent: () => import('./credisanes/credisan-detail/credisan-detail.component').then(c => c.CredisanDetailComponent) },
      { path: 'metodos-pago', loadComponent: () => import('./payment-methods/payment-methods.component').then(c => c.PaymentMethodsComponent) },
      { path: 'transacciones', loadComponent: () => import('./transactions/transactions.component').then(c => c.TransactionsComponent) },
      { path: 'plantillas', loadComponent: () => import('./wp-templates-list/wp-templates-list.component').then(c => c.WpTemplatesListComponent) },
      { path: 'crear-plantillas', loadComponent: () => import('./wp-template-create/wp-template-create.component').then(c => c.WpTemplateCreateComponent) },
      { path: 'whatsapp-settings', loadComponent: () => import('./whatsapp-settings/whatsapp-settings.component').then(c => c.WhatsappSettingsComponent) },
      { path: 'perfil', loadComponent: () => import('./profile/profile.component').then(c => c.ProfileComponent) },
    //   {
    //     path: 'perfil',
    //     loadChildren: () => import('./perfil/perfil.routes').then(m => m.PERFIL_ROUTES)
    //   },
      // Ruta por defecto al entrar a /dashboard
      { path: '', redirectTo: 'sanes', pathMatch: 'full' } 
    ]
  }
];
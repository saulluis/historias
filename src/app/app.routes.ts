import { Routes } from '@angular/router';
import { TabsComponent } from './tabs/tabs.component';
import { HomeComponent } from './home/home.component';
import { ForoComponent } from './foro/foro.component';
import { TiendaComponent } from './tienda/tienda.component';
import { SolicitudComponent } from './solicitud/solicitud.component';
import { ExperienciaComponent } from './experiencia/experiencia.component';
import { ForoDetalleComponent } from './foro-detalle/foro-detalle.component';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  {
    path: 'tabs',
    component: TabsComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'foro', component: ForoComponent },
      { path: 'tienda', component: TiendaComponent },
      { path: 'solicitudes',component: SolicitudComponent },
      { path: 'foro',component: ForoComponent },
      { path: 'foro/:id',component: ForoDetalleComponent },
      { path: 'experiencia', component: ExperienciaComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'tabs' },
];

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ServiceAPI } from '../services/service-api';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface Asistente {
  id: number;
  nombre: string;
  correo: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaSolicitud: Date; 
  experienciaId: number;
  edad?: number;
}

// Mapea el DTO del backend
interface Experiencia {
  id: number;
  name: string;           // Del DTO
  description: string;    // Del DTO
  fecha: Date;            // Del DTO
  capacidad: number;      // Del DTO
  costo: number;          // Del DTO
  estado: boolean;        // Del DTO
}

interface DiaCalendario {
  numero: number;
  fecha: Date;
  tieneExperiencia: boolean;
  experiencias: Experiencia[];
  esOtroMes: boolean;
}

@Component({
  selector: 'app-experiencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './experiencia.component.html',
  styleUrls: ['./experiencia.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienciaComponent implements OnInit, OnDestroy {
  private api = inject(ServiceAPI);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSubscription?: Subscription;

  experiencias = signal<Experiencia[]>([]);
  asistentes = signal<Asistente[]>([]);
  mostrarFormularioAsistencia = signal(false);
  experienciaParaAplicar = signal<Experiencia | null>(null);
  
  // Calendario
  mesActual = signal(new Date());
  diasCalendario = computed(() => this.generarCalendario());
  experienciaSeleccionada = signal<Experiencia | null>(null);
  mostrarCardExperiencia = signal(false);
  diaSeleccionado = signal<Date | null>(null);
  
  // Computed para filtrar experiencias del mes actual
  experienciasDelMes = computed(() => {
    const mes = this.mesActual();
    return this.experiencias().filter(exp => 
      exp.fecha.getMonth() === mes.getMonth() && 
      exp.fecha.getFullYear() === mes.getFullYear() &&
      exp.estado
    );
  });
  
  diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  formularioAsistencia = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    edad: ['', [Validators.required, Validators.min(18)]]
  });

  ngOnInit(): void {
    this.cargarExperiencias();
    
    // Escuchar eventos de navegación para recargar datos al volver
    this.routerSubscription = this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter(event => event.urlAfterRedirects.includes('/experiencia'))
      )
      .subscribe(() => {
        console.log('🔄 Recargando experiencias al volver a la página');
        this.cargarExperiencias();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  cargarExperiencias(): void {
    console.log('📥 Cargando experiencias desde el backend...');
    this.api.findAll().subscribe({
      next: (data: any[]) => {
        // Mapea correctamente desde el DTO del backend
        const experienciasFormateadas = data.map(exp => ({
          id: exp.id,
          name: exp.name,
          description: exp.description,
          fecha: new Date(exp.fecha),
          capacidad: exp.capacidad,
          costo: exp.costo,
          estado: exp.estado
        }));
        this.experiencias.set(experienciasFormateadas);
        console.log('✅ Experiencias actualizadas:', experienciasFormateadas);
        
        // Forzar detección de cambios para reflejar los nuevos datos
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando experiencias:', err);
        this.cargarExperienciasDefecto();
      }
    });
  }

  cargarExperienciasDefecto(): void {
    // Fechas de ejemplo para demostración
    const hoy = new Date();
    this.experiencias.set([
      {
        id: 1,
        name: 'Taller de Destilación',
        description: 'Aprende el proceso artesanal',
        fecha: new Date(2023, 10, 3), // Nov 3
        capacidad: 20,
        costo: 1200,
        estado: true
      },
      {
        id: 2,
        name: 'Cata Premium',
        description: 'Degustación de mezcales selectos',
        fecha: new Date(2023, 10, 6), // Nov 6
        capacidad: 15,
        costo: 1500,
        estado: true
      },
      {
        id: 3,
        name: 'Tour de Campo',
        description: 'Visita a los campos de agave',
        fecha: new Date(2023, 10, 11), // Nov 11
        capacidad: 25,
        costo: 1800,
        estado: true
      },
      {
        id: 4,
        name: 'Cata Premium',
        description: 'Degustación de mezcales selectos',
        fecha: new Date(2023, 10, 13), // Nov 13
        capacidad: 15,
        costo: 1500,
        estado: true
      },
      {
        id: 5,
        name: 'Taller de Destilación',
        description: 'Aprende el proceso artesanal',
        fecha: new Date(2023, 10, 20), // Nov 20
        capacidad: 20,
        costo: 1200,
        estado: true
      },
      {
        id: 6,
        name: 'Tour de Campo',
        description: 'Visita a los campos de agave',
        fecha: new Date(2023, 10, 24), // Nov 24
        capacidad: 25,
        costo: 1800,
        estado: true
      },
      {
        id: 7,
        name: 'Cata Premium',
        description: 'Degustación de mezcales selectos',
        fecha: new Date(2023, 10, 27), // Nov 27
        capacidad: 15,
        costo: 1500,
        estado: true
      }
    ]);
  }

  // Métodos del calendario
  generarCalendario(): DiaCalendario[] {
    const mes = this.mesActual();
    const anio = mes.getFullYear();
    const numeroMes = mes.getMonth();
    
    const primerDia = new Date(anio, numeroMes, 1);
    const ultimoDia = new Date(anio, numeroMes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    
    const primerDiaSemana = primerDia.getDay();
    
    const dias: DiaCalendario[] = [];
    
    // Días del mes anterior
    const mesAnterior = new Date(anio, numeroMes, 0);
    const diasMesAnterior = mesAnterior.getDate();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const fecha = new Date(anio, numeroMes - 1, diasMesAnterior - i);
      dias.push({
        numero: diasMesAnterior - i,
        fecha,
        tieneExperiencia: false,
        experiencias: [],
        esOtroMes: true
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anio, numeroMes, dia);
      const experienciasDelDia = this.experiencias().filter(exp => 
        this.mismaFecha(exp.fecha, fecha) && exp.estado
      );
      
      dias.push({
        numero: dia,
        fecha,
        tieneExperiencia: experienciasDelDia.length > 0,
        experiencias: experienciasDelDia,
        esOtroMes: false
      });
    }
    
    // Días del mes siguiente para completar la cuadrícula
    const diasRestantes = 42 - dias.length; // 6 semanas x 7 días
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const fecha = new Date(anio, numeroMes + 1, dia);
      dias.push({
        numero: dia,
        fecha,
        tieneExperiencia: false,
        experiencias: [],
        esOtroMes: true
      });
    }
    
    return dias;
  }

  mismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
  }

  mesAnterior(): void {
    const nuevaFecha = new Date(this.mesActual());
    nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    this.mesActual.set(nuevaFecha);
  }

  mesSiguiente(): void {
    const nuevaFecha = new Date(this.mesActual());
    nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    this.mesActual.set(nuevaFecha);
  }

  getNombreMes(): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mes = this.mesActual();
    return `${meses[mes.getMonth()]} ${mes.getFullYear()}`;
  }

  seleccionarDia(dia: DiaCalendario): void {
    if (dia.tieneExperiencia && !dia.esOtroMes) {
      this.diaSeleccionado.set(dia.fecha);
      // Mostrar solo la primera experiencia del día
      if (dia.experiencias.length > 0) {
        this.experienciaSeleccionada.set(dia.experiencias[0]);
        this.mostrarCardExperiencia.set(true);
      }
    }
  }

  cerrarCardExperiencia(): void {
    this.mostrarCardExperiencia.set(false);
    this.experienciaSeleccionada.set(null);
  }

  abrirFormularioAsistencia(experiencia: Experiencia): void {
    // Guardamos la experiencia seleccionada (opcional, para uso futuro)
    this.experienciaParaAplicar.set(experiencia);
    // Cerramos la card si está abierta
    this.cerrarCardExperiencia();
    // Redirigimos al componente de solicitudes con el estado de la experiencia
    this.router.navigate(['/tabs/solicitudes'], {
      state: { experienciaSeleccionada: experiencia }
    });
  }

  cerrarFormularioAsistencia(): void {
    this.mostrarFormularioAsistencia.set(false);
    this.formularioAsistencia.reset();
    this.cerrarCardExperiencia();
  }

  confirmarAsistencia(): void {
    if (!this.formularioAsistencia.valid) return;
    
    const formValue = this.formularioAsistencia.value;
    const experiencia = this.experienciaParaAplicar();
    
    if (experiencia) {
      const nuevoAsistente: Asistente = {
        id: Date.now(),
        nombre: formValue.nombre!,
        correo: '', // No requerido en este flujo
        edad: Number(formValue.edad),
        estado: 'pendiente',
        fechaSolicitud: new Date(),
        experienciaId: experiencia.id
      };
      
      this.asistentes.update(lista => [...lista, nuevoAsistente]);
      this.cerrarFormularioAsistencia();
      this.cerrarCardExperiencia();
      alert(`¡Registro exitoso para ${experiencia.name}!`);
      console.log('Asistencia confirmada:', nuevoAsistente);
    }
  }

  getCuposDisponibles(experienciaId: number): number {
    const experiencia = this.experiencias().find(e => e.id === experienciaId);
    if (!experiencia?.capacidad) return 0;
    
    const aprobados = this.getAsistentesAprobados(experienciaId).length;
    return experiencia.capacidad - aprobados;
  }

  getAsistentesAprobados(experienciaId: number): Asistente[] {
    return this.asistentes().filter(
      a => a.experienciaId === experienciaId && a.estado === 'aprobada'
    );
  }

  getAsistentesPorExperiencia(experienciaId: number): Asistente[] {
    return this.asistentes().filter(a => a.experienciaId === experienciaId);
  }
}

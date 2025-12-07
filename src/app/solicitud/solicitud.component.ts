import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';
import { ServiceAPI } from '../services/service-api';

@Component({
  selector: 'app-solicitud',
  templateUrl: './solicitud.component.html',
  styleUrls: ['./solicitud.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class SolicitudComponent  implements OnInit {
  form!: FormGroup;
  catas$!: Observable<any[]>;
  loading = false;
  successMsg = '';
  errorMsg = '';
  selectedCata: any | null = null;
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private fb: FormBuilder, private api: ServiceAPI, private router: Router) {
    // Verificar si hay una experiencia seleccionada en el estado de navegación
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { experienciaSeleccionada?: any };
    if (state?.experienciaSeleccionada) {
      this.selectedCata = state.experienciaSeleccionada;
    }
  }

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      genero: ['masculino', [Validators.required]],
      Idcata: [null, [Validators.required]],
    });
    this.catas$ = this.api.findAll();
    
    // Si hay una experiencia pre-seleccionada, cargarla en el formulario
    if (this.selectedCata) {
      this.form.patchValue({ Idcata: this.selectedCata.id });
    }
  }

  selectCata(cata: any) {
    const cuposDisponibles = cata?.capacidad ?? 0;
    
    if (cuposDisponibles <= 0) {
      this.errorMsg = '❌ Cupos no disponibles para esta cata. Por favor, selecciona otra.';
      this.selectedCata = null;
      this.form.patchValue({ Idcata: null });
      return;
    }
    
    if (cata?.estado === false) {
      this.errorMsg = '❌ Esta cata no está disponible en este momento.';
      this.selectedCata = null;
      this.form.patchValue({ Idcata: null });
      return;
    }
    
    this.selectedCata = cata;
    this.form.patchValue({ Idcata: cata?.id ?? null });
    this.successMsg = `✓ Cata seleccionada: ${cuposDisponibles} cupos disponibles`;
    this.errorMsg = '';
  }

  cambiarCata() {
    this.router.navigate(['/tabs/experiencia']);
  }

  volverAExperiencias() {
    this.router.navigate(['/tabs/experiencia']);
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.toastMessage = mensaje;
    this.toastType = tipo;
    this.showToast = true;
    
    // Ocultar toast después de 3 segundos (3000ms)
    setTimeout(() => {
      this.showToast = false;
      // Limpiar mensaje después de que termine la animación
      setTimeout(() => {
        this.toastMessage = '';
      }, 400);
    }, 3000);
  }

  submit() {
    this.successMsg = '';
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedCata) {
      this.errorMsg = 'Primero selecciona un día de cata';
      return;
    }
    
    // Verificar cupos disponibles antes de proceder
    const cuposDisponibles = this.selectedCata?.capacidad ?? 0;
    if (cuposDisponibles <= 0) {
      console.warn('⚠️ Intento de registro sin cupos disponibles');
      
      // Mostrar toast de error
      this.mostrarToast('❌ Cupos no disponibles. Redirigiendo al calendario...', 'error');
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        this.router.navigate(['/tabs/experiencia']);
      }, 3000);
      return;
    }
    
    const raw = this.form.value;
    const payload = {
      nome: raw.nome,
      email: raw.email,
      telefono: raw.telefono,
      status: 0,
      genero: raw.genero,
      Idcata: Number(raw.Idcata),
    };
    
    this.loading = true;
    console.log('📝 Registrando usuario. Cupos antes:', cuposDisponibles);
    
    const nextCap = Math.max(cuposDisponibles - 1, 0);
    
    this.api
      .createUsuario(payload)
      .pipe(
        switchMap((usuarioCreado) => {
          console.log('✅ Usuario creado:', usuarioCreado);
          console.log('🔄 Actualizando capacidad a:', nextCap);
          
          return this.api.patchExperiencia(Number(raw.Idcata), { capacidad: nextCap }).pipe(
            catchError((err) => {
              console.error('❌ Error actualizando capacidad:', err);
              this.errorMsg = 'Usuario creado, pero no se actualizó la capacidad';
              return of(null);
            })
          );
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('✅ Capacidad actualizada en BD:', response);
          }
          
          console.log('✅ Proceso completo: Usuario registrado y capacidad actualizada');
          
          // Mostrar toast de éxito
          this.mostrarToast('✓ Registro exitoso. Redirigiendo al calendario...', 'success');
          
          // Esperar 3 segundos para mostrar el toast y luego redirigir
          setTimeout(() => {
            this.router.navigate(['/tabs/experiencia']);
          }, 3000);
        },
        error: (err) => {
          const detail = err?.error?.message || err?.error || err?.statusText || 'Error al crear usuario';
          this.errorMsg = typeof detail === 'string' ? detail : 'Error al crear usuario';
          console.error('❌ Error en el proceso de registro:', err);
          console.log('Payload enviado:', payload);
        },
      });
  }

}

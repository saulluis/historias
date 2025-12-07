import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ServiceAPI } from '../services/service-api';

interface Usuario {
  id: number;
  nome: string;
  email?: string;
  Idcata?: number;
}

interface Bebida {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen: string;
  categoria: { id: number; nombre: string };
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  volumen: string;
  origen: string;
  imagen: string;
  rating: number;
}

interface Apartado {
  id: number;
  cantidad: number;
  usuarioID: number;
  bebidasID: number;
  bebida?: any;
  usuario?: Usuario;
  createdAt?: Date;
}

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.scss']
})
export class TiendaComponent implements OnInit {
  // Propiedades para bebidas (apartado)
  bebidas$!: Observable<Bebida[]>;
  usuarios$!: Observable<Usuario[]>;
  experiencias$!: Observable<any[]>;
  apartados: Apartado[] = [];
  selectedUserId: number | null = null;
  qty: Record<number, number> = {};
  mostrarApartados = false;
  usuarios: Usuario[] = [];
  experiencias: any[] = [];
  cargandoUsuarios = true;
  usuarioVerificado = false;
  correoIngresado = '';
  mostrandoVerificacion = false;
  
  // Propiedades para productos (catálogo)
  productos = signal<Producto[]>([]);
  productoSeleccionado = signal<Producto | null>(null);
  cantidadCarrito = signal(0);

  constructor(private api: ServiceAPI) { }

  ngOnInit() {
    this.bebidas$ = this.api.findAllBebidas();
    
    // Cargar TODOS los usuarios (deben verificarse con correo)
    this.cargandoUsuarios = true;
    this.api.getUsuarios().subscribe({
      next: (todosUsuarios) => {
        // Ahora mostramos todos los usuarios, pero deben verificar con correo
        this.usuarios = todosUsuarios;
        console.log('✅ Usuarios cargados (requieren verificación):', this.usuarios);
        this.cargandoUsuarios = false;
      },
      error: (err) => {
        console.error('❌ Error cargando usuarios:', err);
        this.usuarios = [];
        this.cargandoUsuarios = false;
      }
    });
    
    this.experiencias$ = this.api.findAll();
    
    this.api.findAll().subscribe({
      next: (experiencias) => this.experiencias = experiencias
    });
  }

  onSelectUser(idStr: string | number) {
    if (!idStr) {
      this.selectedUserId = null;
      this.usuarioVerificado = false;
      this.correoIngresado = '';
      return;
    }
    
    const id = typeof idStr === 'string' ? Number(idStr) : idStr;
    const usuarioSeleccionado = this.usuarios.find(u => u.id === id);
    
    if (!usuarioSeleccionado) {
      alert('❌ Usuario no encontrado');
      return;
    }
    
    // Solicitar correo para verificación
    const correoIngresado = prompt(`📧 Para confirmar tu identidad, ingresa el correo electrónico registrado para:\n\n👤 ${usuarioSeleccionado.nome}`);
    
    if (!correoIngresado) {
      console.log('❌ Verificación cancelada');
      this.selectedUserId = null;
      return;
    }
    
    // Verificar que el correo coincida (case insensitive)
    const correoUsuario = usuarioSeleccionado.email?.toLowerCase().trim();
    const correoInput = correoIngresado.toLowerCase().trim();
    
    if (correoUsuario !== correoInput) {
      alert('❌ El correo ingresado no coincide con el registrado. Acceso denegado.');
      console.warn('⚠️ Intento de acceso fallido:', {
        esperado: correoUsuario,
        ingresado: correoInput
      });
      this.selectedUserId = null;
      this.usuarioVerificado = false;
      return;
    }
    
    // Correo verificado exitosamente
    this.selectedUserId = id;
    this.usuarioVerificado = true;
    this.correoIngresado = correoIngresado;
    console.log('✅ Usuario verificado exitosamente:', usuarioSeleccionado.nome);
    alert(`✓ Identidad verificada correctamente\n\n👤 Bienvenido, ${usuarioSeleccionado.nome}`);
    
    // Si está en la vista de apartados, cargar sus apartados
    if (this.mostrarApartados) {
      this.cargarApartadosDelUsuario();
    }
  }

  displayedStock(b: Bebida): number {
    const cantidadSeleccionada = this.qty[b.id] || 0;
    return Math.max(0, b.stock - cantidadSeleccionada);
  }

  inc(b: Bebida) {
    const current = this.qty[b.id] || 0;
    if (current < b.stock) {
      this.qty[b.id] = current + 1;
    }
  }

  dec(b: Bebida) {
    const current = this.qty[b.id] || 0;
    if (current > 0) {
      this.qty[b.id] = current - 1;
    }
  }

  canApartar(b: Bebida): boolean {
    const cantidad = this.qty[b.id] || 0;
    return !!this.selectedUserId && this.usuarioVerificado && cantidad > 0 && cantidad <= b.stock;
  }

  apartar(b: Bebida) {
    const cantidad = this.qty[b.id] || 0;
    
    // Validaciones
    if (!this.selectedUserId) {
      alert('⚠️ Por favor, selecciona un usuario');
      return;
    }
    
    if (!this.usuarioVerificado) {
      alert('❌ Debes verificar tu identidad con el correo electrónico antes de apartar productos');
      return;
    }
    
    if (cantidad <= 0) {
      alert('⚠️ Por favor, selecciona una cantidad mayor a 0');
      return;
    }
    
    if (cantidad > b.stock) {
      alert(`❌ Cantidad solicitada (${cantidad}) es mayor al stock disponible (${b.stock})`);
      return;
    }
    
    const payload = {
      cantidad,
      usuarioID: this.selectedUserId,
      bebidasID: b.id,
    };
    
    console.log('📦 Creando apartado:', payload);
    
    this.api.createApartado(payload).subscribe({
      next: (apartado) => {
        console.log('✅ Apartado creado exitosamente en BD:', apartado);
        
        // Calcular nuevo stock
        const nuevoStock = b.stock - cantidad;
        console.log(`📊 Actualizando stock en BD: ${b.stock} - ${cantidad} = ${nuevoStock}`);
        
        // Actualizar stock en el backend
        this.api.patchBebida(b.id, { stock: nuevoStock }).subscribe({
          next: (response) => {
            console.log('✅ Stock actualizado en BD:', response);
            console.log('🔄 Recargando bebidas desde BD para reflejar cambios...');
            
            // Resetear cantidad seleccionada localmente
            this.qty[b.id] = 0;
            
            // Recargar lista de bebidas desde el backend para reflejar cambios
            this.api.findAllBebidas().subscribe({
              next: (bebidasActualizadas) => {
                console.log('✅ Bebidas recargadas desde BD:', bebidasActualizadas);
                this.bebidas$ = this.api.findAllBebidas();
                
                // Mostrar notificación de éxito
                this.mostrarNotificacionApartado(b, cantidad);
              },
              error: (err) => {
                console.error('❌ Error recargando bebidas:', err);
                // Aún así intentar mostrar la notificación
                this.bebidas$ = this.api.findAllBebidas();
                this.mostrarNotificacionApartado(b, cantidad);
              }
            });
          },
          error: (err) => {
            console.error('❌ Error actualizando stock en BD:', err);
            alert('⚠️ Apartado creado pero no se pudo actualizar el stock en la base de datos. Por favor, recarga la página.');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error creando apartado en BD:', err);
        const errorMsg = err?.error?.message || err?.message || 'Error desconocido';
        alert(`❌ Error al apartar el producto: ${errorMsg}`);
      }
    });
  }
  
  mostrarNotificacionApartado(bebida: Bebida, cantidad: number): void {
    const usuario = this.usuarios.find(u => u.id === this.selectedUserId);
    const nombreUsuario = usuario?.nome || 'Usuario';
    const emailUsuario = usuario?.email || 'N/A';
    
    let infoCata = '';
    if (usuario?.Idcata) {
      const cata = this.experiencias.find(e => e.id === usuario.Idcata);
      if (cata) {
        const fechaCata = new Date(cata.fecha).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        infoCata = `\n📅 Día de cata: ${fechaCata}`;
      }
    }
    
    const mensaje = `✓ Producto apartado exitosamente\n\n` +
      `📦 Producto: ${bebida.nombre}\n` +
      `👤 Usuario: ${nombreUsuario}\n` +
      `📧 Correo: ${emailUsuario}\n` +
      `🔢 Cantidad: ${cantidad} unidad(es)\n` +
      `💰 Total: ${(bebida.precio * cantidad).toFixed(2)} MXN` +
      infoCata;
    
    alert(mensaje);
  }
  
  toggleApartados(): void {
    if (!this.selectedUserId && !this.mostrarApartados) {
      alert('⚠️ Por favor, selecciona y verifica un usuario primero para ver sus apartados');
      return;
    }
    
    if (!this.usuarioVerificado && !this.mostrarApartados) {
      alert('❌ Debes verificar tu identidad con el correo electrónico antes de ver los apartados');
      return;
    }
    
    this.mostrarApartados = !this.mostrarApartados;
    if (this.mostrarApartados && this.selectedUserId) {
      this.cargarApartadosDelUsuario();
    }
  }
  
  cargarApartados(): void {
    this.api.findAllApartados().subscribe({
      next: (apartados) => {
        this.apartados = apartados;
        console.log('✅ Apartados cargados:', apartados);
      },
      error: (err) => {
        console.error('❌ Error cargando apartados:', err);
        alert('❌ Error al cargar apartados');
      }
    });
  }
  
  cargarApartadosDelUsuario(): void {
    if (!this.selectedUserId) {
      console.warn('⚠️ No hay usuario seleccionado');
      this.apartados = [];
      return;
    }
    
    console.log('🔍 Cargando apartados del usuario:', this.selectedUserId);
    this.api.getApartadosByUsuario(this.selectedUserId).subscribe({
      next: (apartadosRaw) => {
        console.log(`📦 Apartados RAW recibidos de BD (${apartadosRaw.length}):`, apartadosRaw);
        
        if (apartadosRaw.length === 0) {
          this.apartados = [];
          console.log('ℹ️ No hay apartados para este usuario');
          return;
        }
        
        // Mapear los apartados para normalizar la estructura
        // El backend devuelve bebidasID como objeto, necesitamos mapearlo a bebida
        const apartadosNormalizados = apartadosRaw.map(apartadoRaw => {
          const apartado: any = {
            id: apartadoRaw.id,
            cantidad: apartadoRaw.cantidad,
            usuarioID: apartadoRaw.usuarioID,
            createdAt: apartadoRaw.createdAt
          };
          
          // El backend devuelve la bebida en bebidasID (por la relación)
          if (apartadoRaw.bebidasID && typeof apartadoRaw.bebidasID === 'object') {
            console.log(`✅ Apartado ${apartadoRaw.id} tiene bebida en bebidasID:`, apartadoRaw.bebidasID);
            apartado.bebida = apartadoRaw.bebidasID; // Copiar el objeto bebida
            apartado.bebidasID = apartadoRaw.bebidasID.id; // Guardar el ID numérico
          } else if (typeof apartadoRaw.bebidasID === 'number') {
            console.log(`⚠️ Apartado ${apartadoRaw.id} solo tiene ID de bebida: ${apartadoRaw.bebidasID}`);
            apartado.bebidasID = apartadoRaw.bebidasID;
            apartado.bebida = null;
          }
          
          // También copiar usuarioID si viene como objeto
          if (apartadoRaw.usuarioID && typeof apartadoRaw.usuarioID === 'object') {
            apartado.usuario = apartadoRaw.usuarioID;
            apartado.usuarioID = apartadoRaw.usuarioID.id;
          }
          
          return apartado;
        });
        
        console.log(`✅ Apartados normalizados:`, apartadosNormalizados.map(a => ({
          id: a.id,
          producto: a.bebida?.nombre,
          precio: a.bebida?.precio,
          cantidad: a.cantidad,
          total: a.cantidad * (a.bebida?.precio || 0)
        })));
        
        this.apartados = apartadosNormalizados;
      },
      error: (err) => {
        console.error('❌ Error cargando apartados del usuario:', err);
        this.apartados = [];
        alert('❌ Error al cargar apartados del usuario');
      }
    });
  }
  
  eliminarApartado(apartadoId: number): void {
    // Encontrar el apartado antes de eliminarlo
    const apartado = this.apartados.find(a => a.id === apartadoId);
    
    if (!apartado) {
      alert('❌ No se encontró el apartado');
      return;
    }
    
    const nombreProducto = apartado.bebida?.nombre || 'este producto';
    const cantidad = apartado.cantidad;
    
    if (confirm(`¿Deseas cancelar este apartado?\n\n📦 Producto: ${nombreProducto}\n🔢 Cantidad: ${cantidad} unidades\n\nEl stock se restaurará automáticamente.`)) {
      console.log('🗑️ Eliminando apartado:', apartadoId);
      
      this.api.deleteApartado(apartadoId).subscribe({
        next: () => {
          console.log('✅ Apartado eliminado');
          
          // Restaurar el stock
          const bebidaId = apartado.bebidasID;
          
          // Obtener el stock actual de la bebida
          this.api.getBebidaById(bebidaId).subscribe({
            next: (bebida) => {
              const nuevoStock = bebida.stock + cantidad;
              console.log(`📊 Restaurando stock: ${bebida.stock} + ${cantidad} = ${nuevoStock}`);
              
              // Actualizar el stock en el backend
              this.api.patchBebida(bebidaId, { stock: nuevoStock }).subscribe({
                next: (response) => {
                  console.log('✅ Stock restaurado exitosamente en BD:', response);
                  console.log('🔄 Recargando bebidas desde BD para reflejar stock restaurado...');
                  
                  // Eliminar de la lista local
                  this.apartados = this.apartados.filter(a => a.id !== apartadoId);
                  
                  // Recargar bebidas desde BD para visualizar el stock actualizado
                  this.api.findAllBebidas().subscribe({
                    next: (bebidasActualizadas) => {
                      console.log('✅ Bebidas recargadas desde BD con stock restaurado:', bebidasActualizadas);
                      this.bebidas$ = this.api.findAllBebidas();
                      
                      // Mostrar mensaje de éxito
                      alert(`✓ Apartado cancelado exitosamente\n\n📦 ${nombreProducto}\n📈 Stock restaurado en BD: +${cantidad} unidades`);
                    },
                    error: (err) => {
                      console.error('❌ Error recargando bebidas:', err);
                      this.bebidas$ = this.api.findAllBebidas();
                      alert(`✓ Apartado cancelado exitosamente\n\n📦 ${nombreProducto}\n📈 Stock restaurado: +${cantidad} unidades`);
                    }
                  });
                },
                error: (err) => {
                  console.error('❌ Error restaurando stock en BD:', err);
                  alert('⚠️ Apartado eliminado pero no se pudo restaurar el stock en la base de datos. Por favor, actualiza manualmente.');
                  this.apartados = this.apartados.filter(a => a.id !== apartadoId);
                }
              });
            },
            error: (err) => {
              console.error('❌ Error obteniendo bebida:', err);
              alert('⚠️ Apartado eliminado pero no se pudo restaurar el stock.');
              this.apartados = this.apartados.filter(a => a.id !== apartadoId);
            }
          });
        },
        error: (err) => {
          console.error('❌ Error eliminando apartado:', err);
          alert('❌ Error al eliminar apartado');
        }
      });
    } else {
      console.log('❌ Eliminación cancelada por el usuario');
    }
  }
  
  calcularTotal(apartado: Apartado): number {
    return apartado.cantidad * (apartado.bebida?.precio || 0);
  }
  
  getNombreUsuario(usuarioId: number): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nome : 'Usuario desconocido';
  }
  
  getEmailUsuario(usuarioId: number): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.email || 'N/A' : 'N/A';
  }
  
  getFechaCata(usuarioId: number): string {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    if (usuario?.Idcata) {
      const cata = this.experiencias.find(e => e.id === usuario.Idcata);
      if (cata) {
        return new Date(cata.fecha).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }
    return 'Sin asignar';
  }

  // Métodos para productos
  cargarProductos(): void {
    this.api.findAllBebidas().subscribe({
      next: (bebidas: any[]) => {
        const productosFormateados = bebidas.map(b => ({
          id: b.id,
          nombre: b.nombre,
          precio: b.precio,
          descripcion: b.descripcion || 'Mezcal artesanal de alta calidad',
          volumen: '40% Vol.',
          origen: 'Oaxaca',
          imagen: b.imagen || 'assets/productos/default.jpg',
          rating: 4.8
        }));
        this.productos.set(productosFormateados);
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
      }
    });
  }

  abrirDetalle(producto: Producto): void {
    this.productoSeleccionado.set(producto);
  }

  cerrarDetalle(): void {
    this.productoSeleccionado.set(null);
  }

  agregarAlCarrito(producto: Producto): void {
    this.cantidadCarrito.update(cant => cant + 1);
    console.log(`Agregado ${producto.nombre} al carrito`);
  }

  estrellas(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }
}

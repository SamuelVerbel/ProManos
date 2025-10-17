class TrabajadorManager {
    constructor() {
        this.solicitudes = [];
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!authManager.checkAuth('trabajadores')) {
            return;
        }

        await this.cargarSolicitudes();
        this.setupEventListeners();
        this.mostrarInfoUsuario();
        this.actualizarEstadisticas();
        this.cargarPerfil();
    }

    setupEventListeners() {
        // Event listeners para acciones del trabajador
    }

    mostrarInfoUsuario() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage && authManager.user) {
            welcomeMessage.textContent = `Bienvenido, ${authManager.user.nombre || 'Trabajador'}`;
        }
    }

    async cargarPerfil() {
        try {
            const token = authManager.token;
            const response = await fetch('/api/perfil', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.mostrarPerfil(data.perfil);
                }
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    }

    mostrarPerfil(perfil) {
        document.getElementById('perfilEspecialidad').textContent = perfil.oficio || perfil.especialidad || 'No especificada';
        document.getElementById('perfilExperiencia').textContent = perfil.experiencia || 0;
        document.getElementById('perfilCalificacion').textContent = perfil.calificacion || '0';
    }

    async cargarSolicitudes() {
        try {
            const token = authManager.token;
            const response = await fetch('/api/solicitudes?tipo=trabajador', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.solicitudes = await response.json();
            } else {
                this.solicitudes = [];
            }
            
            this.mostrarSolicitudes();
            this.actualizarEstadisticas();
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            this.solicitudes = [];
            this.mostrarSolicitudes();
        }
    }

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        if (!container) return;

        if (this.solicitudes.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h3>No hay solicitudes disponibles</h3>
                    <p class="text-muted">Las nuevas solicitudes aparecerán aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.solicitudes
            .map(solicitud => `
                <div class="solicitud-item ${solicitud.estado}">
                    <div class="solicitud-header">
                        <span class="solicitud-tipo badge bg-primary">${this.getTipoDisplay(solicitud.oficio)}</span>
                        <span class="solicitud-estado estado-${solicitud.estado}">
                            ${this.getEstadoDisplay(solicitud.estado)}
                        </span>
                    </div>
                    
                    <div class="solicitud-body">
                        <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                        <p><strong>Ubicación:</strong> ${solicitud.ubicacion}</p>
                        <p><strong>Presupuesto:</strong> $${solicitud.presupuesto || '0'}</p>
                        <p><strong>Fecha:</strong> ${new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')}</p>
                    </div>
                    
                    <div class="solicitud-actions">
                        ${solicitud.estado === 'pendiente' ? 
                            `<button class="btn btn-primary btn-sm" onclick="trabajadorManager.aceptarSolicitud('${solicitud.id}')">
                                <i class="fas fa-check"></i> Aceptar Trabajo
                            </button>` : ''}
                        
                        ${solicitud.estado === 'asignado' && solicitud.trabajador_asignado === authManager.user?.id ? 
                            `<button class="btn btn-success btn-sm" onclick="trabajadorManager.completarSolicitud('${solicitud.id}')">
                                <i class="fas fa-flag-checkered"></i> Marcar como Completado
                            </button>` : ''}
                    </div>
                </div>
            `).join('');
    }

    getTipoDisplay(tipo) {
        const tipos = {
            'albañil': 'Albañilería',
            'plomero': 'Plomería',
            'electricista': 'Electricidad',
            'pintor': 'Pintura',
            'carpintero': 'Carpintería'
        };
        return tipos[tipo] || tipo;
    }

    getEstadoDisplay(estado) {
        const estados = {
            'pendiente': '🟡 Pendiente',
            'asignado': '🔵 Asignado',
            'en_proceso': '🟠 En Proceso',
            'completada': '✅ Completada',
            'cancelada': '❌ Cancelada'
        };
        return estados[estado] || estado;
    }

    async aceptarSolicitud(solicitudId) {
        if (!confirm('¿Aceptar esta solicitud de trabajo?')) {
            return;
        }

        try {
            const token = authManager.token;
            const response = await fetch(`/api/solicitudes/${solicitudId}/aceptar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trabajador_id: authManager.user?.id
                })
            });

            if (response.ok) {
                showNotification('✅ Solicitud aceptada', 'success');
                await this.cargarSolicitudes();
                await this.actualizarEstadisticas();
            } else {
                const error = await response.json();
                showNotification('❌ ' + (error.mensaje || 'Error al aceptar solicitud'), 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    async completarSolicitud(solicitudId) {
        if (!confirm('¿Marcar este trabajo como completado?')) {
            return;
        }

        try {
            const token = authManager.token;
            const response = await fetch(`/api/solicitudes/${solicitudId}/completar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showNotification('🎉 Trabajo marcado como completado', 'success');
                await this.cargarSolicitudes();
                await this.actualizarEstadisticas();
            } else {
                showNotification('❌ Error al completar solicitud', 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    actualizarEstadisticas() {
        const total = this.solicitudes.length;
        const pendientes = this.solicitudes.filter(s => s.estado === 'pendiente').length;
        const aceptadas = this.solicitudes.filter(s => s.estado === 'asignado' && s.trabajador_asignado === authManager.user?.id).length;
        const completadas = this.solicitudes.filter(s => s.estado === 'completada' && s.trabajador_asignado === authManager.user?.id).length;

        document.getElementById('stat-total')?.textContent = total;
        document.getElementById('stat-pendientes')?.textContent = pendientes;
        document.getElementById('stat-aceptadas')?.textContent = aceptadas;
        document.getElementById('stat-completadas')?.textContent = completadas;
    }
}

// Instancia global
const trabajadorManager = new TrabajadorManager();
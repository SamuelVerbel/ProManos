class TrabajadorManager {
    constructor() {
        this.solicitudes = [];
        this.trabajos = [];
        this.init();
    }

    async init() {
        if (!authManager.checkAuth('trabajadores')) {
            return;
        }

        await this.cargarSolicitudes();
        await this.cargarTrabajos();
        await this.cargarPerfil();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Aquí irán los event listeners para botones
    }

    async cargarSolicitudes() {
        try {
            const token = authManager.token;
            const response = await fetch('/api/solicitudes/trabajador', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.solicitudes = await response.json();
                this.mostrarSolicitudes();
            } else {
                this.solicitudes = [];
                this.mostrarSolicitudes();
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            this.solicitudes = [];
            this.mostrarSolicitudes();
        }
    }

    async cargarTrabajos() {
        try {
            const token = authManager.token;
            const response = await fetch('/api/trabajos/trabajador', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.trabajos = await response.json();
                this.mostrarTrabajos();
            } else {
                this.trabajos = [];
                this.mostrarTrabajos();
            }
        } catch (error) {
            console.error('Error cargando trabajos:', error);
            this.trabajos = [];
            this.mostrarTrabajos();
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

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        if (!container) return;

        if (this.solicitudes.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h4>No hay solicitudes disponibles</h4>
                    <p class="text-muted">No hay solicitudes pendientes en este momento</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.solicitudes.map(solicitud => `
            <div class="solicitud-item" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <strong class="badge" style="background: #e74c3c; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">
                            ${this.getTipoDisplay(solicitud.oficio)}
                        </strong>
                        <small class="text-muted" style="margin-left: 0.5rem;">
                            ${new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')}
                        </small>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.5rem;">
                    <p style="margin: 0; font-size: 0.9rem;"><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                </div>
                
                <div style="margin-bottom: 0.5rem;">
                    <p style="margin: 0; font-size: 0.9rem;"><strong>Ubicación:</strong> ${solicitud.ubicacion}</p>
                </div>

                <div style="margin-bottom: 0.5rem;">
                    <p style="margin: 0; font-size: 0.9rem;"><strong>Presupuesto:</strong> $${solicitud.presupuesto || '0'}</p>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-success" onclick="trabajadorManager.aceptarSolicitud('${solicitud.id}')" 
                            style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        <i class="fas fa-check"></i> Aceptar Trabajo
                    </button>
                    
                    <button class="btn btn-sm btn-outline-primary" onclick="trabajadorManager.verDetallesSolicitud('${solicitud.id}')" 
                            style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                </div>
            </div>
        `).join('');
    }

    mostrarTrabajos() {
        const container = document.getElementById('trabajosContainer');
        if (!container) return;

        if (this.trabajos.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-clipboard-list fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No tienes trabajos programados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.trabajos.map(trabajo => `
            <div class="trabajo-item" style="border-left: 4px solid #27ae60; padding: 0.5rem; margin-bottom: 0.5rem; background: #f8f9fa;">
                <p style="margin: 0; font-weight: 500;">${trabajo.descripcion}</p>
                <small class="text-muted">Asignado: ${new Date(trabajo.fecha_asignacion).toLocaleDateString('es-ES')}</small>
                <div style="margin-top: 0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="trabajadorManager.completarTrabajo('${trabajo.id}')">
                        <i class="fas fa-check-circle"></i> Marcar como Completado
                    </button>
                </div>
            </div>
        `).join('');
    }

    mostrarPerfil(perfil) {
        // Actualizar información del perfil en la UI
        document.getElementById('especialidad').textContent = perfil.oficio || 'No especificada';
        document.getElementById('experiencia').textContent = perfil.experiencia ? `${perfil.experiencia} años` : '- años';
        document.getElementById('calificacion').textContent = perfil.calificacion ? `${perfil.calificacion}/5` : '-/5';
    }

    getTipoDisplay(tipo) {
        const tipos = {
            'albañil': 'Albañilería',
            'plomero': 'Plomería',
            'electricista': 'Electricidad',
            'pintor': 'Pintura',
            'carpintero': 'Carpintería',
            'jardinero': 'Jardinería'
        };
        return tipos[tipo] || tipo;
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
                    trabajador_id: authManager.user.id
                })
            });

            if (response.ok) {
                showNotification('✅ Solicitud aceptada correctamente', 'success');
                await this.cargarSolicitudes();
                await this.cargarTrabajos();
            } else {
                showNotification('❌ Error al aceptar solicitud', 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    verDetallesSolicitud(id) {
        const solicitud = this.solicitudes.find(s => s.id === id);
        if (solicitud) {
            alert(`Detalles de la solicitud:\n\nTipo: ${this.getTipoDisplay(solicitud.oficio)}\nDescripción: ${solicitud.descripcion}\nUbicación: ${solicitud.ubicacion}\nPresupuesto: $${solicitud.presupuesto || '0'}`);
        }
    }

    async completarTrabajo(trabajoId) {
        if (!confirm('¿Marcar este trabajo como completado?')) {
            return;
        }

        try {
            const token = authManager.token;
            const response = await fetch(`/api/trabajos/${trabajoId}/completar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showNotification('✅ Trabajo marcado como completado', 'success');
                await this.cargarTrabajos();
            } else {
                showNotification('❌ Error al completar trabajo', 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
    }
}

// Instancia global
const trabajadorManager = new TrabajadorManager();
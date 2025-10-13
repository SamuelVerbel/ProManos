class TrabajadorManager {
    constructor() {
        this.solicitudes = [];
        this.init();
    }

    async init() {
        await this.cargarSolicitudes();
        this.setupEventListeners();
        this.actualizarEstadisticas();
    }

    setupEventListeners() {
        // Event listeners para acciones del trabajador
    }

    async cargarSolicitudes() {
        try {
            const response = await fetch('/api/solicitudes');
            this.solicitudes = await response.json();
            this.mostrarSolicitudes();
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
        }
    }

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        if (!container) return;

        container.innerHTML = this.solicitudes
            .map(solicitud => `
                <div class="solicitud-item ${solicitud.estado}">
                    <div class="solicitud-header">
                        <span class="solicitud-tipo">${solicitud.tipo}</span>
                        <span class="solicitud-estado estado-${solicitud.estado}">
                            ${solicitud.estado}
                        </span>
                    </div>
                    <p><strong>Cliente:</strong> ${solicitud.cliente}</p>
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Dirección:</strong> ${solicitud.direccion}</p>
                    <p><strong>Teléfono:</strong> ${solicitud.telefono}</p>
                    <p><strong>Fecha:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>
                    
                    <div class="action-buttons">
                        ${solicitud.estado === 'pendiente' ? 
                            `<button class="btn btn-primary btn-sm" onclick="trabajadorManager.aceptarSolicitud(${solicitud.id})">
                                <i class="fas fa-check"></i> Aceptar
                            </button>` : ''}
                        
                        ${solicitud.estado === 'aceptada' ? 
                            `<button class="btn btn-success btn-sm" onclick="trabajadorManager.completarSolicitud(${solicitud.id})">
                                <i class="fas fa-flag-checkered"></i> Completar
                            </button>` : ''}
                    </div>
                </div>
            `).join('');
    }

    async aceptarSolicitud(solicitudId) {
        try {
            // En una implementación real, esto llamaría a una API
            const solicitud = this.solicitudes.find(s => s.id === solicitudId);
            if (solicitud) {
                solicitud.estado = 'aceptada';
                solicitud.trabajadorAsignado = authManager.user?.nombre;
                showNotification('✅ Solicitud aceptada', 'success');
                this.mostrarSolicitudes();
                this.actualizarEstadisticas();
            }
        } catch (error) {
            showNotification('❌ Error al aceptar solicitud', 'danger');
        }
    }

    async completarSolicitud(solicitudId) {
        try {
            const solicitud = this.solicitudes.find(s => s.id === solicitudId);
            if (solicitud) {
                solicitud.estado = 'completada';
                showNotification('🎉 Trabajo marcado como completado', 'success');
                this.mostrarSolicitudes();
                this.actualizarEstadisticas();
            }
        } catch (error) {
            showNotification('❌ Error al completar solicitud', 'danger');
        }
    }

    actualizarEstadisticas() {
        const total = this.solicitudes.length;
        const pendientes = this.solicitudes.filter(s => s.estado === 'pendiente').length;
        const aceptadas = this.solicitudes.filter(s => s.estado === 'aceptada').length;
        const completadas = this.solicitudes.filter(s => s.estado === 'completada').length;

        document.getElementById('stat-total')?.textContent = total;
        document.getElementById('stat-pendientes')?.textContent = pendientes;
        document.getElementById('stat-aceptadas')?.textContent = aceptadas;
        document.getElementById('stat-completadas')?.textContent = completadas;
    }
}

// Instancia global
const trabajadorManager = new TrabajadorManager();
class ClienteManager {
    constructor() {
        this.solicitudes = [];
        this.init();
    }

    async init() {
        await this.cargarSolicitudes();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => this.crearSolicitud(e));
        }
    }

    async crearSolicitud(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const solicitud = {
            tipo: formData.get('tipo'),
            descripcion: formData.get('descripcion'),
            direccion: formData.get('direccion'),
            telefono: formData.get('telefono'),
            correo: formData.get('correo'),
            cliente: authManager.user?.nombre || 'Anónimo'
        };

        try {
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(solicitud)
            });

            const data = await response.json();

            if (data.success) {
                showNotification('✅ Solicitud creada exitosamente', 'success');
                e.target.reset();
                await this.cargarSolicitudes();
            } else {
                showNotification('❌ Error al crear solicitud', 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
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

        if (this.solicitudes.length === 0) {
            container.innerHTML = `
                <div class="card text-center">
                    <h3>No hay solicitudes aún</h3>
                    <p>Crea tu primera solicitud de servicio</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.solicitudes
            .filter(s => s.cliente === (authManager.user?.nombre || 'Anónimo'))
            .map(solicitud => `
                <div class="solicitud-item ${solicitud.estado}">
                    <div class="solicitud-header">
                        <span class="solicitud-tipo">${solicitud.tipo}</span>
                        <span class="solicitud-estado estado-${solicitud.estado}">
                            ${solicitud.estado}
                        </span>
                    </div>
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Dirección:</strong> ${solicitud.direccion}</p>
                    <p><strong>Fecha:</strong> ${new Date(solicitud.fecha).toLocaleDateString()}</p>
                    ${solicitud.trabajadorAsignado ? 
                        `<p><strong>Trabajador asignado:</strong> ${solicitud.trabajadorAsignado}</p>` : ''}
                </div>
            `).join('');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/clientes')) {
        new ClienteManager();
    }
});
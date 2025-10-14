class ClienteManager {
    constructor() {
        this.solicitudes = [];
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!authManager.checkAuth('clientes')) {
            return;
        }

        await this.cargarSolicitudes();
        this.setupEventListeners();
        this.mostrarInfoUsuario();
    }

    setupEventListeners() {
        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => this.crearSolicitud(e));
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => authManager.logout());
        }

        // Botón de editar perfil
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.editarPerfil());
        }
    }

    mostrarInfoUsuario() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo && authManager.user) {
            userInfo.innerHTML = `
                <div class="user-welcome">
                    <h3>¡Hola, ${authManager.user.nombre}!</h3>
                    <p>Bienvenido a tu panel de cliente</p>
                </div>
            `;
        }
    }

    async crearSolicitud(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const solicitud = {
            id: Date.now().toString(),
            tipo: formData.get('tipo'),
            descripcion: formData.get('descripcion'),
            direccion: formData.get('direccion'),
            telefono: formData.get('telefono'),
            correo: formData.get('correo'),
            cliente: authManager.user?.nombre || 'Anónimo',
            clienteEmail: authManager.user?.email,
            estado: 'pendiente',
            fecha: new Date().toISOString(),
            presupuestos: []
        };

        try {
            // Simular envío a API (mientras no tengas backend real)
            const response = await this.guardarSolicitudLocal(solicitud);

            if (response.success) {
                showNotification('✅ Solicitud creada exitosamente', 'success');
                e.target.reset();
                await this.cargarSolicitudes();
            } else {
                showNotification('❌ Error al crear solicitud', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    // Función temporal para guardar localmente hasta que tengas backend
    async guardarSolicitudLocal(solicitud) {
        try {
            // Obtener solicitudes existentes
            let solicitudes = JSON.parse(localStorage.getItem('solicitudesClientes') || '[]');
            
            // Agregar nueva solicitud
            solicitudes.push(solicitud);
            
            // Guardar en localStorage
            localStorage.setItem('solicitudesClientes', JSON.stringify(solicitudes));
            
            return { success: true, solicitud };
        } catch (error) {
            return { success: false, message: 'Error al guardar' };
        }
    }

    async cargarSolicitudes() {
        try {
            // Cargar desde localStorage temporalmente
            this.solicitudes = JSON.parse(localStorage.getItem('solicitudesClientes') || '[]');
            
            // Filtrar solo las solicitudes del usuario actual
            this.solicitudes = this.solicitudes.filter(s => 
                s.clienteEmail === authManager.user?.email
            );
            
            this.mostrarSolicitudes();
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            showNotification('Error al cargar solicitudes', 'danger');
        }
    }

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        if (!container) return;

        if (this.solicitudes.length === 0) {
            container.innerHTML = `
                <div class="card text-center">
                    <div class="card-body">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h3>No hay solicitudes aún</h3>
                        <p class="text-muted">Crea tu primera solicitud de servicio</p>
                        <a href="#serviceForm" class="btn btn-primary mt-2">
                            <i class="fas fa-plus"></i> Crear Solicitud
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.solicitudes.map(solicitud => `
            <div class="solicitud-card ${solicitud.estado}">
                <div class="solicitud-header">
                    <div class="solicitud-info">
                        <span class="solicitud-tipo badge bg-primary">${this.getTipoDisplay(solicitud.tipo)}</span>
                        <span class="solicitud-fecha">${new Date(solicitud.fecha).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</span>
                    </div>
                    <span class="solicitud-estado estado-${solicitud.estado}">
                        ${this.getEstadoDisplay(solicitud.estado)}
                    </span>
                </div>
                
                <div class="solicitud-body">
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Dirección:</strong> ${solicitud.direccion}</p>
                    <p><strong>Contacto:</strong> ${solicitud.telefono} | ${solicitud.correo}</p>
                </div>

                ${solicitud.trabajadorAsignado ? `
                    <div class="solicitud-asignado">
                        <strong>Trabajador asignado:</strong> ${solicitud.trabajadorAsignado}
                    </div>
                ` : ''}

                ${solicitud.presupuestos && solicitud.presupuestos.length > 0 ? `
                    <div class="solicitud-presupuestos">
                        <strong>Presupuestos recibidos:</strong> ${solicitud.presupuestos.length}
                    </div>
                ` : ''}

                <div class="solicitud-actions">
                    ${solicitud.estado === 'pendiente' ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="clienteManager.cancelarSolicitud('${solicitud.id}')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-sm btn-outline-primary" onclick="clienteManager.verDetalles('${solicitud.id}')">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                </div>
            </div>
        `).join('');
    }

    getTipoDisplay(tipo) {
        const tipos = {
            'albanileria': 'Albañilería',
            'electricidad': 'Electricidad',
            'plomeria': 'Plomería',
            'pintura': 'Pintura',
            'carpinteria': 'Carpintería'
        };
        return tipos[tipo] || tipo;
    }

    getEstadoDisplay(estado) {
        const estados = {
            'pendiente': '🟡 Pendiente',
            'asignado': '🔵 Asignado',
            'en_proceso': '🟠 En Proceso',
            'completado': '✅ Completado',
            'cancelado': '❌ Cancelado'
        };
        return estados[estado] || estado;
    }

    async cancelarSolicitud(id) {
        if (!confirm('¿Estás seguro de que quieres cancelar esta solicitud?')) {
            return;
        }

        try {
            // Actualizar estado en localStorage
            let solicitudes = JSON.parse(localStorage.getItem('solicitudesClientes') || '[]');
            solicitudes = solicitudes.map(s => 
                s.id === id ? { ...s, estado: 'cancelado' } : s
            );
            localStorage.setItem('solicitudesClientes', JSON.stringify(solicitudes));

            showNotification('✅ Solicitud cancelada', 'success');
            await this.cargarSolicitudes();
        } catch (error) {
            showNotification('❌ Error al cancelar solicitud', 'danger');
        }
    }

    verDetalles(id) {
        const solicitud = this.solicitudes.find(s => s.id === id);
        if (solicitud) {
            alert(`Detalles de la solicitud:\n\nTipo: ${this.getTipoDisplay(solicitud.tipo)}\nDescripción: ${solicitud.descripcion}\nDirección: ${solicitud.direccion}\nEstado: ${this.getEstadoDisplay(solicitud.estado)}`);
        }
    }

    editarPerfil() {
        // Redirigir a la página de edición de perfil
        window.location.href = 'editar-perfil.html';
    }
}

// Instancia global para acceso desde HTML
const clienteManager = new ClienteManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/clientes')) {
        // Ya se inicializa automáticamente en el constructor
    }
});
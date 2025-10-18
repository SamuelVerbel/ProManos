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
        this.cargarEstadisticas();
    }

    setupEventListeners() {
        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => this.crearSolicitud(e));
        }
    }

    mostrarInfoUsuario() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage && authManager.user) {
            welcomeMessage.textContent = `Bienvenido, ${authManager.user.nombre || 'Cliente'}`;
        }
    }

    async crearSolicitud(e) {
        e.preventDefault();
        
        const tipo = document.getElementById('tipo').value;
        const descripcion = document.getElementById('descripcion').value;
        const direccion = document.getElementById('direccion').value;
        const telefono = document.getElementById('telefono').value;
        const correo = document.getElementById('correo').value;

        // Validar campos requeridos
        if (!tipo || !descripcion || !direccion) {
            showNotification('❌ Por favor completa todos los campos requeridos', 'danger');
            return;
        }

        const solicitudData = {
            titulo: `Solicitud de ${this.getTipoDisplay(tipo)}`,
            descripcion: descripcion,
            oficio: tipo,
            presupuesto: 0,
            ubicacion: direccion,
            telefono: telefono,
            correo: correo
        };

        console.log('📤 Enviando solicitud:', solicitudData); // Debug

        try {
            const result = await this.crearSolicitudAPI(solicitudData);
            
            if (result.success) {
                showNotification('✅ Solicitud creada exitosamente', 'success');
                e.target.reset();
                await this.cargarSolicitudes();
                await this.cargarEstadisticas();
            } else {
                showNotification('❌ ' + (result.mensaje || 'Error al crear solicitud'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    async crearSolicitudAPI(solicitudData) {
        try {
            const token = authManager.token;
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(solicitudData)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error al crear solicitud:', error);
            return { success: false, mensaje: 'Error de conexión' };
        }
    }

    async cargarSolicitudes() {
        try {
            console.log('🔄 Cargando solicitudes...'); // Debug
            
            const token = authManager.token;
            const response = await fetch('/api/solicitudes/cliente', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.solicitudes = await response.json();
                console.log('✅ Solicitudes cargadas:', this.solicitudes); // Debug
            } else {
                console.error('❌ Error en respuesta:', response.status);
                this.solicitudes = [];
            }
            
            this.mostrarSolicitudes();
        } catch (error) {
            console.error('❌ Error cargando solicitudes:', error);
            this.solicitudes = [];
            this.mostrarSolicitudes();
        }
    }

    async cargarEstadisticas() {
        try {
            const token = authManager.token;
            const response = await fetch('/api/estadisticas', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.mostrarEstadisticas(data.estadisticas);
                }
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    mostrarEstadisticas(estadisticas) {
        document.getElementById('stat-total').textContent = estadisticas.total_solicitudes || 0;
        document.getElementById('stat-pendientes').textContent = estadisticas.solicitudes_pendientes || 0;
        document.getElementById('stat-completadas').textContent = estadisticas.solicitudes_completadas || 0;
    }

    mostrarSolicitudes() {
        const container = document.getElementById('solicitudesContainer');
        if (!container) return;

        if (this.solicitudes.length === 0) {
            container.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h3>No hay solicitudes aún</h3>
                    <p class="text-muted">Crea tu primera solicitud de servicio</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.solicitudes.map(solicitud => `
            <div class="solicitud-card ${solicitud.estado}">
                <div class="solicitud-header">
                    <div class="solicitud-info">
                        <span class="solicitud-tipo badge bg-primary">${this.getTipoDisplay(solicitud.oficio)}</span>
                        <span class="solicitud-fecha">${new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')}</span>
                    </div>
                    <span class="solicitud-estado estado-${solicitud.estado}">
                        ${this.getEstadoDisplay(solicitud.estado)}
                    </span>
                </div>
                
                <div class="solicitud-body">
                    <p><strong>Descripción:</strong> ${solicitud.descripcion}</p>
                    <p><strong>Ubicación:</strong> ${solicitud.ubicacion}</p>
                    <p><strong>Presupuesto:</strong> $${solicitud.presupuesto || '0'}</p>
                </div>

                ${solicitud.trabajador_asignado ? `
                    <div class="solicitud-asignado">
                        <strong>Trabajador asignado:</strong> ${solicitud.trabajador_asignado}
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

    async cancelarSolicitud(id) {
        if (!confirm('¿Estás seguro de que quieres cancelar esta solicitud?')) {
            return;
        }

        try {
            const token = authManager.token;
            const response = await fetch(`/api/solicitudes/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado: 'cancelada'
                })
            });

            if (response.ok) {
                showNotification('✅ Solicitud cancelada', 'success');
                await this.cargarSolicitudes();
                await this.cargarEstadisticas();
            } else {
                showNotification('❌ Error al cancelar solicitud', 'danger');
            }
        } catch (error) {
            showNotification('❌ Error de conexión', 'danger');
        }
    }

    verDetalles(id) {
        const solicitud = this.solicitudes.find(s => s.id === id);
        if (solicitud) {
            alert(`Detalles de la solicitud:\n\nTipo: ${this.getTipoDisplay(solicitud.oficio)}\nDescripción: ${solicitud.descripcion}\nUbicación: ${solicitud.ubicacion}\nEstado: ${this.getEstadoDisplay(solicitud.estado)}`);
        }
    }
}

// Instancia global
const clienteManager = new ClienteManager();
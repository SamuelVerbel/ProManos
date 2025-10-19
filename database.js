// database.js - Manejador de base de datos completo
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.filePath = path.join(__dirname, 'data', 'database.json');
        this.init();
    }

    // En database.js - Método para migrar a archivos separados
    async migrateToSeparateFiles() {
        const data = this.read();
        
        // Guardar archivos separados
        fs.writeFileSync(path.join(__dirname, 'data', 'clientes.json'), 
            JSON.stringify(data.clientes, null, 2));
        fs.writeFileSync(path.join(__dirname, 'data', 'trabajadores.json'), 
            JSON.stringify(data.trabajadores, null, 2));
        fs.writeFileSync(path.join(__dirname, 'data', 'solicitudes.json'), 
            JSON.stringify(data.solicitudes, null, 2));
        
        console.log('✅ Base de datos migrada a archivos separados');
    }

    init() {
        // Crear directorio si no existe
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Crear archivo con estructura inicial si no existe
        if (!fs.existsSync(this.filePath)) {
            const initialData = this.getInitialStructure();
            this.save(initialData);
        }
    }

    // Leer datos
    read() {
        try {
            if (!fs.existsSync(this.filePath)) {
                return this.getInitialStructure();
            }
            
            const data = fs.readFileSync(this.filePath, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Asegurar que tenga la estructura correcta
            return {
                clientes: parsedData.clientes || [],
                trabajadores: parsedData.trabajadores || [],
                solicitudes: parsedData.solicitudes || [],
                trabajos_activos: parsedData.trabajos_activos || [],
                password_reset_tokens: parsedData.password_reset_tokens || []
            };
        } catch (error) {
            console.error('Error reading database:', error);
            return this.getInitialStructure();
        }
    }

    // Guardar datos
    save(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            return false;
        }
    }

    // Generar IDs únicos
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // === MÉTODOS PARA USUARIOS ===
    async addUser(tipo, userData) {
        console.log('💾 Guardando usuario en BD...');
        const data = this.read();
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser = {
            id: this.generateId(tipo === 'clientes' ? 'cli' : 'tra'),
            ...userData,
            password: hashedPassword,
            fecha_registro: new Date().toISOString(),
            ultimo_login: null
        };
        
        // Asegurar que la dirección se guarde para clientes
        if (tipo === 'clientes') {
            newUser.direccion = userData.direccion || '';
        }
        
        data[tipo === 'clientes' ? 'clientes' : 'trabajadores'].push(newUser);
        
        console.log('📊 Estado de BD antes de guardar:');
        console.log('- Clientes:', data.clientes.length);
        console.log('- Trabajadores:', data.trabajadores.length);
        
        const saved = this.save(data);
        console.log('✅ Usuario guardado correctamente:', saved);
        
        return newUser;
    }

    async findUserByEmail(tipo, email) {
        const data = this.read();
        const users = data[tipo === 'clientes' ? 'clientes' : 'trabajadores'];
        return users.find(user => user.email === email);
    }

    async findUserById(tipo, userId) {
        const data = this.read();
        const users = data[tipo === 'clientes' ? 'clientes' : 'trabajadores'];
        return users.find(user => user.id === userId);
    }

    async updateLastLogin(userType, userId) {
        const data = this.read();
        const users = data[userType === 'clientes' ? 'clientes' : 'trabajadores'];
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].ultimo_login = new Date().toISOString();
            this.save(data);
            return true;
        }
        return false;
    }

    async updatePassword(userType, userId, newPassword) {
        const data = this.read();
        const users = data[userType === 'clientes' ? 'clientes' : 'trabajadores'];
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            this.save(data);
            return true;
        }
        return false;
    }

    async updateUserProfile(userType, userId, updateData) {
        const data = this.read();
        const users = data[userType === 'clientes' ? 'clientes' : 'trabajadores'];
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updateData };
            this.save(data);
            return users[userIndex];
        }
        return null;
    }

    // === MÉTODOS PARA RECUPERACIÓN DE CONTRASEÑA ===
    async saveResetToken(email, token, expiration) {
        const data = this.read();
        
        // Limpiar tokens expirados
        data.password_reset_tokens = data.password_reset_tokens.filter(
            t => new Date(t.expira) > new Date()
        );
        
        data.password_reset_tokens.push({
            email: email,
            token: token,
            expira: expiration.toISOString(),
            usado: false
        });
        
        this.save(data);
        return true;
    }

    async getResetToken(token) {
        const data = this.read();
        return data.password_reset_tokens.find(t => t.token === token);
    }

    async markTokenAsUsed(token) {
        const data = this.read();
        const tokenIndex = data.password_reset_tokens.findIndex(t => t.token === token);
        if (tokenIndex !== -1) {
            data.password_reset_tokens[tokenIndex].usado = true;
            this.save(data);
            return true;
        }
        return false;
    }

    // === MÉTODOS PARA SOLICITUDES ===
    async createSolicitud(solicitudData) {
        const data = this.read();
        const nuevaSolicitud = {
            id: this.generateId('sol'),
            ...solicitudData,
            fecha_creacion: new Date().toISOString(),
            estado: 'pendiente',
            trabajador_asignado: null,
            fecha_completada: null
        };
        
        data.solicitudes.push(nuevaSolicitud);
        this.save(data);
        return nuevaSolicitud;
    }

    async getSolicitudesByCliente(clienteId) {
        const data = this.read();
        return data.solicitudes.filter(sol => sol.cliente_id === clienteId);
    }

    async getSolicitudesPendientes() {
        const data = this.read();
        return data.solicitudes.filter(sol => sol.estado === 'pendiente');
    }

    async getSolicitudesByTrabajador(trabajadorId) {
        const data = this.read();
        return data.solicitudes.filter(sol => sol.trabajador_asignado === trabajadorId);
    }

    async updateSolicitudEstado(solicitudId, nuevoEstado, trabajadorId = null) {
        const data = this.read();
        const solicitudIndex = data.solicitudes.findIndex(sol => sol.id === solicitudId);
        
        if (solicitudIndex !== -1) {
            data.solicitudes[solicitudIndex].estado = nuevoEstado;
            
            if (trabajadorId) {
                data.solicitudes[solicitudIndex].trabajador_asignado = trabajadorId;
            }
            
            if (nuevoEstado === 'completada') {
                data.solicitudes[solicitudIndex].fecha_completada = new Date().toISOString();
            }
            
            this.save(data);
            return data.solicitudes[solicitudIndex];
        }
        return null;
    }

    // === MÉTODOS PARA TRABAJOS ACTIVOS ===
    async createTrabajoActivo(trabajoData) {
        const data = this.read();
        const nuevoTrabajo = {
            id: this.generateId('trab'),
            ...trabajoData,
            fecha_asignacion: new Date().toISOString(),
            estado: 'en_progreso'
        };
        
        data.trabajos_activos.push(nuevoTrabajo);
        this.save(data);
        return nuevoTrabajo;
    }

    async getTrabajosActivosByTrabajador(trabajadorId) {
        const data = this.read();
        return data.trabajos_activos.filter(trab => 
            trab.trabajador_id === trabajadorId && trab.estado === 'en_progreso'
        );
    }

    async getTrabajosActivosByCliente(clienteId) {
        const data = this.read();
        return data.trabajos_activos.filter(trab => 
            trab.cliente_id === clienteId && trab.estado === 'en_progreso'
        );
    }

    async updateTrabajoEstado(trabajoId, nuevoEstado) {
        const data = this.read();
        const trabajoIndex = data.trabajos_activos.findIndex(trab => trab.id === trabajoId);
        
        if (trabajoIndex !== -1) {
            data.trabajos_activos[trabajoIndex].estado = nuevoEstado;
            
            if (nuevoEstado === 'completado') {
                data.trabajos_activos[trabajoIndex].fecha_completado = new Date().toISOString();
            }
            
            this.save(data);
            return data.trabajos_activos[trabajoIndex];
        }
        return null;
    }

    // === MÉTODOS GENERALES ===
    async getAllTrabajadores() {
        const data = this.read();
        return data.trabajadores.filter(trab => trab.disponible !== false);
    }

    async getTrabajadoresByOficio(oficio) {
        const data = this.read();
        return data.trabajadores.filter(trab => 
            trab.oficio === oficio && trab.disponible !== false
        );
    }

    async updateTrabajadorDisponibilidad(trabajadorId, disponible) {
        const data = this.read();
        const trabajadorIndex = data.trabajadores.findIndex(trab => trab.id === trabajadorId);
        
        if (trabajadorIndex !== -1) {
            data.trabajadores[trabajadorIndex].disponible = disponible;
            this.save(data);
            return true;
        }
        return false;
    }

    getInitialStructure() {
        return {
            clientes: [],
            trabajadores: [],
            solicitudes: [],
            trabajos_activos: [],
            password_reset_tokens: []
        };
    }

    // En la clase Database, agregar:
    async getTrabajosActivosByTrabajador(trabajadorId) {
        const data = this.read();
        return data.trabajos_activos.filter(trab => 
            trab.trabajador_id === trabajadorId && trab.estado === 'en_progreso'
        );
    }

    // Método para debugging - ver estadísticas
    getStats() {
        try {
            const data = this.read();
            
            // Asegurar que todas las propiedades existan
            return {
                total_clientes: data.clientes?.length || 0,
                total_trabajadores: data.trabajadores?.length || 0,
                total_solicitudes: data.solicitudes?.length || 0,
                solicitudes_pendientes: data.solicitudes?.filter(s => s.estado === 'pendiente').length || 0,
                trabajos_activos: data.trabajos_activos?.filter(t => t.estado === 'en_progreso').length || 0
            };
        } catch (error) {
            console.error('Error en getStats:', error);
            return {
                total_clientes: 0,
                total_trabajadores: 0,
                total_solicitudes: 0,
                solicitudes_pendientes: 0,
                trabajos_activos: 0
            };
        }
    }
}

module.exports = new Database();
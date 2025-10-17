const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// Importar nuestra nueva base de datos
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'promanos_secreto_2025';

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());

// Logger simple para depuración
app.use((req, res, next) => {
    console.log('[REQ]', req.method, req.url);
    next();
});

// Ruta de prueba - TEMPORAL
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Servir páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ======== RUTAS PARA ARCHIVOS HTML ========
// Trabajadores
app.get('/trabajadores/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trabajador', 'login.html'));
});

app.get('/trabajadores/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trabajador', 'registro.html'));
});

app.get('/trabajadores/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trabajador', 'dashboard.html'));
});

// Clientes
app.get('/clientes/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'clientes', 'login.html'));
});

app.get('/clientes/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'clientes', 'registro.html'));
});

app.get('/clientes/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'clientes', 'index.html'));
});

// Servir archivos estáticos
app.use('/clientes', express.static(path.join(__dirname, 'views', 'clientes')));
app.use('/trabajadores', express.static(path.join(__dirname, 'views', 'trabajador')));

app.get('/trabajadores', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trabajador', 'dashboard.html'));
});

// ======== MIDDLEWARE DE AUTENTICACIÓN ========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, mensaje: 'Token requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, mensaje: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// ======== NUEVAS RUTAS API CON BASE DE DATOS MEJORADA ========

// REGISTRO - Usando nueva base de datos
app.post('/api/registro/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const { nombre, email, password, telefono, direccion, oficio, experiencia, especialidades, zona_servicio } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, mensaje: 'Nombre, email y contraseña son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await database.findUserByEmail(tipo, email);
        if (existingUser) {
            return res.status(400).json({ success: false, mensaje: 'El usuario ya existe' });
        }

        // Preparar datos del usuario
        const userData = {
            nombre,
            email,
            password, // Se encriptará en database.js
            telefono: telefono || null,
            direccion: direccion || null
        };

        // Campos específicos para trabajadores
        if (tipo === 'trabajador') {
            if (!oficio) {
                return res.status(400).json({ success: false, mensaje: 'El oficio es requerido para trabajadores' });
            }
            userData.oficio = oficio;
            userData.experiencia = experiencia || 0;
            userData.especialidades = especialidades || [];
            userData.zona_servicio = zona_servicio || ["Cartagena"];
            userData.calificacion = 0;
            userData.disponible = true;
        }

        // Crear usuario en la base de datos
        const newUser = await database.addUser(tipo, userData);

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: newUser.id, 
                email: newUser.email, 
                tipo: tipo,
                nombre: newUser.nombre 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Respuesta sin datos sensibles
        const userResponse = {
            id: newUser.id,
            nombre: newUser.nombre,
            email: newUser.email,
            telefono: newUser.telefono,
            tipo: tipo,
            ...(tipo === 'trabajador' && {
                oficio: newUser.oficio,
                experiencia: newUser.experiencia,
                especialidades: newUser.especialidades
            })
        };

        res.json({ 
            success: true, 
            mensaje: 'Registro exitoso',
            token,
            usuario: userResponse
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

// LOGIN - Usando nueva base de datos
app.post('/api/login/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const { email, password } = req.body;

        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ success: false, mensaje: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario
        const user = await database.findUserByEmail(tipo, email);
        if (!user) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }

        // Actualizar último login
        await database.updateLastLogin(tipo, user.id);

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                tipo: tipo,
                nombre: user.nombre 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Respuesta sin datos sensibles
        const userResponse = {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            telefono: user.telefono,
            tipo: tipo,
            ...(tipo === 'trabajador' && {
                oficio: user.oficio,
                experiencia: user.experiencia,
                especialidades: user.especialidades,
                calificacion: user.calificacion,
                disponible: user.disponible
            })
        };

        res.json({ 
            success: true, 
            mensaje: 'Login exitoso', 
            token,
            usuario: userResponse
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

// RECUPERACIÓN DE CONTRASEÑA
app.post('/api/password-reset/request', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email es requerido' });
        }

        const result = await database.requestPasswordReset(email);
        res.json(result);

    } catch (error) {
        console.error('Error en recuperación:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.post('/api/password-reset/reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token y nueva contraseña son requeridos' });
        }

        const result = await database.resetPassword(token, newPassword);
        res.json(result);

    } catch (error) {
        console.error('Error al resetear contraseña:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// SOLICITUDES
app.post('/api/solicitudes', authenticateToken, async (req, res) => {
    try {
        const { titulo, descripcion, oficio, presupuesto, ubicacion } = req.body;

        if (!titulo || !descripcion || !oficio) {
            return res.status(400).json({ success: false, mensaje: 'Título, descripción y oficio son requeridos' });
        }

        const nuevaSolicitud = await database.createSolicitud({
            cliente_id: req.user.id,
            titulo,
            descripcion,
            oficio,
            presupuesto: presupuesto || 0,
            ubicacion: ubicacion || 'Cartagena'
        });

        res.json({ 
            success: true, 
            mensaje: 'Solicitud creada exitosamente', 
            solicitud: nuevaSolicitud 
        });

    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al crear solicitud' });
    }
});

// OBTENER SOLICITUDES
app.get('/api/solicitudes', async (req, res) => {
    try {
        let solicitudes = [];
        const { tipo, usuario_id } = req.query;

        if (tipo === 'cliente' && usuario_id) {
            solicitudes = await database.getSolicitudesByCliente(usuario_id);
        } else if (tipo === 'trabajador' && usuario_id) {
            solicitudes = await database.getSolicitudesByTrabajador(usuario_id);
        } else {
            solicitudes = await database.getSolicitudesPendientes();
        }

        res.json(solicitudes);

    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener solicitudes' });
    }
});

// TRABAJADORES DISPONIBLES
app.get('/api/trabajadores', async (req, res) => {
    try {
        const { oficio } = req.query;
        let trabajadores;

        if (oficio) {
            trabajadores = await database.getTrabajadoresByOficio(oficio);
        } else {
            trabajadores = await database.getAllTrabajadores();
        }

        res.json(trabajadores);

    } catch (error) {
        console.error('Error al obtener trabajadores:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener trabajadores' });
    }
});

// PERFIL DE USUARIO
app.get('/api/perfil', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.tipo, req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        // Remover datos sensibles
        const { password, ...userProfile } = user;
        res.json({ success: true, perfil: userProfile });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener perfil' });
    }
});

// ACTUALIZAR PERFIL
app.put('/api/perfil', authenticateToken, async (req, res) => {
    try {
        const updateData = req.body;
        
        // No permitir actualizar email o password desde aquí
        delete updateData.email;
        delete updateData.password;

        const updatedUser = await database.updateUserProfile(req.user.tipo, req.user.id, updateData);

        if (!updatedUser) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        // Remover datos sensibles
        const { password, ...userProfile } = updatedUser;
        res.json({ success: true, mensaje: 'Perfil actualizado', perfil: userProfile });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar perfil' });
    }
});

// ESTADÍSTICAS (para dashboard)
app.get('/api/estadisticas', authenticateToken, async (req, res) => {
    try {
        let estadisticas = {};

        if (req.user.tipo === 'cliente') {
            const solicitudes = await database.getSolicitudesByCliente(req.user.id);
            estadisticas = {
                total_solicitudes: solicitudes.length,
                solicitudes_pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
                solicitudes_completadas: solicitudes.filter(s => s.estado === 'completada').length
            };
        } else if (req.user.tipo === 'trabajador') {
            const solicitudes = await database.getSolicitudesByTrabajador(req.user.id);
            const trabajosActivos = await database.getTrabajosActivosByTrabajador(req.user.id);
            
            estadisticas = {
                total_trabajos: solicitudes.length,
                trabajos_pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
                trabajos_completados: solicitudes.filter(s => s.estado === 'completada').length,
                trabajos_activos: trabajosActivos.length
            };
        }

        res.json({ success: true, estadisticas });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener estadísticas' });
    }
});

// Fallback para servir la SPA
app.get('*', (req, res) => {
    if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, 'index.html'), (err) => {
            if (err) {
                console.error('Error sirviendo index.html:', err);
                return res.status(500).send('Server error');
            }
        });
    }
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Panel de cliente: http://localhost:${PORT}/clientes`);
    console.log(`👷 Panel de trabajador: http://localhost:${PORT}/trabajadores`);
    console.log(`📈 Estadísticas de BD:`, database.getStats());
});

// ACTUALIZAR SOLICITUD (para cancelar)
app.put('/api/solicitudes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const solicitud = await database.updateSolicitudEstado(id, estado);
        
        if (solicitud) {
            res.json({ success: true, mensaje: 'Solicitud actualizada', solicitud });
        } else {
            res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar solicitud' });
    }
});

// ACEPTAR SOLICITUD (trabajador)
app.put('/api/solicitudes/:id/aceptar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { trabajador_id } = req.body;

        // Verificar que el usuario es un trabajador
        if (req.user.tipo !== 'trabajadores') {
            return res.status(403).json({ success: false, mensaje: 'Solo los trabajadores pueden aceptar solicitudes' });
        }

        const solicitud = await database.updateSolicitudEstado(id, 'asignado', trabajador_id);
        
        if (solicitud) {
            // Crear trabajo activo
            await database.createTrabajoActivo({
                solicitud_id: id,
                trabajador_id: trabajador_id,
                cliente_id: solicitud.cliente_id,
                descripcion: solicitud.descripcion,
                oficio: solicitud.oficio
            });

            res.json({ success: true, mensaje: 'Solicitud aceptada', solicitud });
        } else {
            res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al aceptar solicitud' });
    }
});

// COMPLETAR SOLICITUD (trabajador)
app.put('/api/solicitudes/:id/completar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario es un trabajador
        if (req.user.tipo !== 'trabajadores') {
            return res.status(403).json({ success: false, mensaje: 'Solo los trabajadores pueden completar solicitudes' });
        }

        const solicitud = await database.updateSolicitudEstado(id, 'completada');
        
        if (solicitud) {
            // Actualizar trabajo activo
            const trabajos = await database.getTrabajosActivosByTrabajador(req.user.id);
            const trabajo = trabajos.find(t => t.solicitud_id === id);
            if (trabajo) {
                await database.updateTrabajoEstado(trabajo.id, 'completado');
            }

            res.json({ success: true, mensaje: 'Solicitud completada', solicitud });
        } else {
            res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

    } catch (error) {
        console.error('Error al completar solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al completar solicitud' });
    }
});
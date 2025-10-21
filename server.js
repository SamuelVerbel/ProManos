const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const emailService = require('./emailService');

// Importar la conexión a MongoDB
const { connectDB } = require('./database');

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

app.get('/recuperar-contrasena.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'clientes', 'recuperar-contrasena.html'));
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

// ======== RUTAS API CON MONGODB ATLAS ========

// REGISTRO - Usando MongoDB Atlas
app.post('/api/registro/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const { nombre, email, password, telefono, direccion, oficio, experiencia, especialidades, zona_servicio } = req.body;

        console.log('📝 Intentando registrar usuario:', { tipo, email, nombre });

        // Validaciones básicas
        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, mensaje: 'Nombre, email y contraseña son requeridos' });
        }

        // Conectar a la base de datos
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        // Verificar si el usuario ya existe
        const existingUser = await usuariosCollection.findOne({ email });
        if (existingUser) {
            console.log('❌ Usuario ya existe:', email);
            return res.status(400).json({ success: false, mensaje: 'El usuario ya existe' });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Preparar datos del usuario
        const userData = {
            nombre,
            email,
            password: hashedPassword,
            telefono: telefono || '',
            direccion: direccion || '',
            rol: tipo,
            fechaRegistro: new Date()
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

        console.log('📦 Datos del usuario a guardar:', userData);

        // Crear usuario en la base de datos
        const result = await usuariosCollection.insertOne(userData);
        const newUser = { id: result.insertedId, ...userData };
        
        console.log('✅ Usuario creado en BD:', newUser.id);

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
        console.error('❌ Error en registro:', error);
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

// LOGIN - Usando MongoDB Atlas
app.post('/api/login/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const { email, password } = req.body;

        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ success: false, mensaje: 'Email y contraseña son requeridos' });
        }

        // Conectar a la base de datos
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        // Buscar usuario
        const user = await usuariosCollection.findOne({ email, rol: tipo });
        if (!user) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }

        // Actualizar último login
        await usuariosCollection.updateOne(
            { _id: user._id },
            { $set: { ultimoLogin: new Date() } }
        );

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email, 
                tipo: tipo,
                nombre: user.nombre 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Respuesta sin datos sensibles
        const userResponse = {
            id: user._id,
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

// SOLICITUDES - CREAR NUEVA SOLICITUD
app.post('/api/solicitudes', authenticateToken, async (req, res) => {
    try {
        const { titulo, descripcion, oficio, presupuesto, ubicacion, telefono, correo } = req.body;

        console.log('📝 Creando solicitud con datos:', req.body);

        if (!titulo || !descripcion || !oficio || !ubicacion) {
            return res.status(400).json({ 
                success: false, 
                mensaje: 'Título, descripción, oficio y ubicación son requeridos' 
            });
        }

        // Conectar a la base de datos
        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');

        const nuevaSolicitud = {
            cliente_id: req.user.id,
            titulo,
            descripcion,
            oficio,
            presupuesto: presupuesto || 0,
            ubicacion: ubicacion,
            telefono: telefono || '',
            correo: correo || '',
            estado: 'pendiente',
            fechaCreacion: new Date()
        };

        const result = await solicitudesCollection.insertOne(nuevaSolicitud);
        const solicitudCreada = { id: result.insertedId, ...nuevaSolicitud };

        console.log('✅ Solicitud creada:', solicitudCreada);

        res.json({ 
            success: true, 
            mensaje: 'Solicitud creada exitosamente', 
            solicitud: solicitudCreada 
        });

    } catch (error) {
        console.error('❌ Error al crear solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al crear solicitud' });
    }
});

// ENDPOINT PARA OBTENER SOLICITUDES DEL CLIENTE
app.get('/api/solicitudes/cliente', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Obteniendo solicitudes para cliente:', req.user.id);
        
        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');
        
        const solicitudes = await solicitudesCollection
            .find({ cliente_id: req.user.id })
            .sort({ fechaCreacion: -1 })
            .toArray();
        
        console.log('✅ Solicitudes encontradas:', solicitudes.length);
        
        res.json(solicitudes);
    } catch (error) {
        console.error('❌ Error al obtener solicitudes del cliente:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener solicitudes' });
    }
});

// TRABAJADORES DISPONIBLES
app.get('/api/trabajadores', async (req, res) => {
    try {
        const { oficio } = req.query;
        
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');
        
        let query = { rol: 'trabajador', disponible: true };
        if (oficio) {
            query.oficio = oficio;
        }

        const trabajadores = await usuariosCollection.find(query).toArray();
        
        // Remover datos sensibles
        const trabajadoresResponse = trabajadores.map(t => ({
            id: t._id,
            nombre: t.nombre,
            oficio: t.oficio,
            experiencia: t.experiencia,
            especialidades: t.especialidades,
            calificacion: t.calificacion,
            telefono: t.telefono
        }));

        res.json(trabajadoresResponse);

    } catch (error) {
        console.error('Error al obtener trabajadores:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener trabajadores' });
    }
});

// PERFIL DE USUARIO
app.get('/api/perfil', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');
        
        const user = await usuariosCollection.findOne({ _id: new ObjectId(req.user.id) });
        
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

        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        const result = await usuariosCollection.updateOne(
            { _id: new ObjectId(req.user.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
        }

        // Obtener usuario actualizado
        const updatedUser = await usuariosCollection.findOne({ _id: new ObjectId(req.user.id) });

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
        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');
        
        let estadisticas = {};

        if (req.user.tipo === 'cliente') {
            const solicitudes = await solicitudesCollection
                .find({ cliente_id: req.user.id })
                .toArray();
                
            estadisticas = {
                total_solicitudes: solicitudes.length,
                solicitudes_pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
                solicitudes_completadas: solicitudes.filter(s => s.estado === 'completada').length
            };
        } else if (req.user.tipo === 'trabajador') {
            const solicitudes = await solicitudesCollection
                .find({ trabajador_id: req.user.id })
                .toArray();
                
            estadisticas = {
                total_trabajos: solicitudes.length,
                trabajos_pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
                trabajos_completados: solicitudes.filter(s => s.estado === 'completada').length,
                trabajos_activos: solicitudes.filter(s => s.estado === 'asignado').length
            };
        }

        res.json({ success: true, estadisticas });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener estadísticas' });
    }
});

// ENDPOINT PARA OBTENER SOLICITUDES PENDIENTES (TRABAJADORES)
app.get('/api/solicitudes/trabajador', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Obteniendo solicitudes para trabajador:', req.user.id);
        
        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');
        
        const solicitudes = await solicitudesCollection
            .find({ estado: 'pendiente' })
            .sort({ fechaCreacion: -1 })
            .toArray();
            
        console.log('✅ Solicitudes encontradas:', solicitudes.length);
        
        res.json(solicitudes);
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener solicitudes' });
    }
});

// ACEPTAR SOLICITUD (trabajador)
app.put('/api/solicitudes/:id/aceptar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario es un trabajador
        if (req.user.tipo !== 'trabajador') {
            return res.status(403).json({ success: false, mensaje: 'Solo los trabajadores pueden aceptar solicitudes' });
        }

        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');

        const result = await solicitudesCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    estado: 'asignado',
                    trabajador_id: req.user.id,
                    fechaAsignacion: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

        const solicitudActualizada = await solicitudesCollection.findOne({ _id: new ObjectId(id) });

        res.json({ success: true, mensaje: 'Solicitud aceptada', solicitud: solicitudActualizada });

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
        if (req.user.tipo !== 'trabajador') {
            return res.status(403).json({ success: false, mensaje: 'Solo los trabajadores pueden completar solicitudes' });
        }

        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');

        const result = await solicitudesCollection.updateOne(
            { _id: new ObjectId(id), trabajador_id: req.user.id },
            { 
                $set: { 
                    estado: 'completada',
                    fechaCompletacion: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

        const solicitudActualizada = await solicitudesCollection.findOne({ _id: new ObjectId(id) });

        res.json({ success: true, mensaje: 'Solicitud completada', solicitud: solicitudActualizada });

    } catch (error) {
        console.error('Error al completar solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al completar solicitud' });
    }
});

// CANCELAR SOLICITUD (cliente)
app.put('/api/solicitudes/:id/cancelar', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');

        const result = await solicitudesCollection.updateOne(
            { _id: new ObjectId(id), cliente_id: req.user.id },
            { 
                $set: { 
                    estado: 'cancelada',
                    fechaCancelacion: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
        }

        res.json({ success: true, mensaje: 'Solicitud cancelada' });

    } catch (error) {
        console.error('Error al cancelar solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al cancelar solicitud' });
    }
});

// OBTENER TRABAJOS ASIGNADOS (TRABAJADOR)
app.get('/api/trabajos/trabajador', authenticateToken, async (req, res) => {
    try {
        console.log('👷 Obteniendo trabajos asignados para:', req.user.id);
        
        const db = await connectDB();
        const solicitudesCollection = db.collection('solicitudes');
        
        const trabajos = await solicitudesCollection
            .find({ 
                trabajador_id: req.user.id,
                estado: 'asignado'
            })
            .sort({ fechaAsignacion: -1 })
            .toArray();
        
        console.log('✅ Trabajos activos encontrados:', trabajos.length);
        
        res.json(trabajos);
    } catch (error) {
        console.error('❌ Error al obtener trabajos:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener trabajos' });
    }
});

// OBTENER CATEGORÍAS
app.get('/api/categorias', async (req, res) => {
    try {
        const db = await connectDB();
        const categoriasCollection = db.collection('categorias');
        
        const categorias = await categoriasCollection.find().toArray();
        res.json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener categorías' });
    }
});

// Función para mostrar estadísticas al iniciar
async function mostrarEstadisticas() {
  try {
    const db = await connectDB();
    const clientes = await db.collection('usuarios').countDocuments({ rol: 'cliente' });
    const trabajadores = await db.collection('usuarios').countDocuments({ rol: 'trabajador' });
    const solicitudes = await db.collection('solicitudes').countDocuments();
    
    console.log(`📈 Estadísticas de BD:`, {
      total_clientes: clientes,
      total_trabajadores: trabajadores, 
      total_solicitudes: solicitudes
    });
  } catch (error) {
    console.log("📊 Estadísticas no disponibles aún");
  }
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Panel de cliente: http://localhost:${PORT}/clientes`);
    console.log(`👷 Panel de trabajador: http://localhost:${PORT}/trabajadores`);
    console.log("✅ MongoDB Atlas conectado correctamente");
    mostrarEstadisticas();
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

// ======== RUTAS DE RECUPERACIÓN DE CONTRASEÑA ========

// Enviar código de recuperación
app.post('/api/send-recovery-code', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📧 Solicitando código de recuperación para:', email);

        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        // Verificar si el usuario existe
        const user = await usuariosCollection.findOne({ email });
        if (!user) {
            return res.json({ 
                success: false, 
                mensaje: 'No existe una cuenta con este email' 
            });
        }

        // Generar código de 6 dígitos
        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar código en la base de datos
        await usuariosCollection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    recoveryCode: recoveryCode,
                    recoveryCodeExpires: new Date(Date.now() + 15 * 60 * 1000)
                } 
            }
        );

        // ✅ ENVIAR EMAIL REAL con Nodemailer
        const emailResult = await emailService.sendVerificationEmail(email, recoveryCode);

        if (emailResult.success) {
            console.log(`✅ Email enviado a ${email}, código: ${recoveryCode}`);
            
            res.json({ 
                success: true, 
                mensaje: 'Código de recuperación enviado a tu email',
                // Solo para desarrollo/testing
                debug_code: recoveryCode
            });
        } else {
            throw new Error('Error enviando email');
        }

    } catch (error) {
        console.error('❌ Error al enviar código:', error);
        res.json({ 
            success: false, 
            mensaje: 'Error al enviar el código de recuperación' 
        });
    }
});

// Verificar código de recuperación
app.post('/api/verify-recovery-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        console.log('🔍 Verificando código:', code, 'para:', email);

        // Conectar a la base de datos
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        // Buscar usuario con código válido y no expirado
        const user = await usuariosCollection.findOne({ 
            email: email,
            recoveryCode: code,
            recoveryCodeExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.json({ 
                success: false, 
                mensaje: 'Código inválido o expirado' 
            });
        }

        console.log('✅ Código verificado correctamente para:', email);

        res.json({ 
            success: true, 
            mensaje: 'Código verificado correctamente' 
        });

    } catch (error) {
        console.error('❌ Error al verificar código:', error);  
        res.json({ 
            success: false, 
            mensaje: 'Error al verificar el código' 
        });
    }
});

// Restablecer contraseña
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        console.log('🔄 Restableciendo contraseña para:', email);

        // Validar longitud de contraseña
        if (newPassword.length < 6) {
            return res.json({ 
                success: false, 
                mensaje: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        // Conectar a la base de datos
        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        // Buscar usuario con código válido
        const user = await usuariosCollection.findOne({ 
            email: email,
            recoveryCode: code,
            recoveryCodeExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.json({ 
                success: false, 
                mensaje: 'Código inválido o expirado' 
            });
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña y limpiar código de recuperación
        await usuariosCollection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    password: hashedPassword 
                },
                $unset: {
                    recoveryCode: "",
                    recoveryCodeExpires: ""
                }
            }
        );

        console.log('✅ Contraseña actualizada para:', email);

        try {
            await emailService.sendPasswordChangedEmail(email);
            console.log('✅ Email de confirmación enviado a:', email);
        } catch (emailError) {
            console.log('⚠️ Email de confirmación no pudo enviarse, pero la contraseña se cambió:', emailError);
        }

        res.json({ 
            success: true, 
            mensaje: 'Contraseña cambiada exitosamente' 
        });

    } catch (error) {
        console.error('❌ Error al restablecer contraseña:', error);
        res.json({ 
            success: false, 
            mensaje: 'Error al cambiar la contraseña' 
        });
    }
});

// Reenviar código de recuperación
app.post('/api/resend-recovery-code', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('🔄 Reenviando código para:', email);

        const db = await connectDB();
        const usuariosCollection = db.collection('usuarios');

        const user = await usuariosCollection.findOne({ email });
        if (!user) {
            return res.json({ 
                success: false, 
                mensaje: 'No existe una cuenta con este email' 
            });
        }

        // Generar nuevo código
        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await usuariosCollection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    recoveryCode: recoveryCode,
                    recoveryCodeExpires: new Date(Date.now() + 15 * 60 * 1000)
                } 
            }
        );

        // ✅ ENVIAR EMAIL REAL
        const emailResult = await emailService.sendVerificationEmail(email, recoveryCode);

        if (emailResult.success) {
            console.log(`✅ Email reenviado a ${email}, nuevo código: ${recoveryCode}`);
            
            res.json({ 
                success: true, 
                mensaje: 'Código reenviado exitosamente',
                debug_code: recoveryCode
            });
        } else {
            throw new Error('Error enviando email');
        }

    } catch (error) {
        console.error('❌ Error al reenviar código:', error);
        res.json({ 
            success: false, 
            mensaje: 'Error al reenviar el código' 
        });
    }
});
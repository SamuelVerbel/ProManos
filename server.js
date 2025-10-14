const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Servir archivos estáticos desde las carpetas correctas
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Servir páginas HTML - RUTAS CORREGIDAS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/clientes/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/login.html'));
});

app.get('/clientes/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/registro.html'));
});

app.get('/clientes/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/index.html'));
});

app.get('/trabajador/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajadores/login.html'));
});

app.get('/trabajador/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajador/registro.html'));
});

app.get('/trabajador/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajador/dashboard.html'));
});

// API Routes - CORREGIDAS
app.post('/api/registro/:tipo', (req, res) => {
    const { tipo } = req.params;
    const { nombre, email, password, especialidad, telefono, experiencia, descripcion } = req.body;
    
    // Usar trabajadores.json en lugar de trabajador.json
    const archivo = `data/${tipo === 'trabajador' ? 'trabajadores' : tipo}.json`;
    let usuarios = [];
    
    try {
        if (fs.existsSync(archivo)) {
            usuarios = JSON.parse(fs.readFileSync(archivo));
        }
        
        // Verificar si el usuario ya existe
        if (usuarios.find(u => u.email === email)) {
            return res.status(400).json({ success: false, mensaje: 'El usuario ya existe' });
        }
        
        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const nuevoUsuario = {
            id: Date.now(),
            nombre,
            email,
            password: hashedPassword,
            telefono: telefono || null,
            fechaRegistro: new Date().toISOString()
        };

        // Agregar campos específicos para trabajadores
        if (tipo === 'trabajador') {
            nuevoUsuario.especialidad = especialidad || null;
            nuevoUsuario.experiencia = experiencia || 0;
            nuevoUsuario.descripcion = descripcion || '';
            nuevoUsuario.calificacion = 0;
            nuevoUsuario.trabajosCompletados = 0;
        }
        
        usuarios.push(nuevoUsuario);
        fs.writeFileSync(archivo, JSON.stringify(usuarios, null, 2));
        
        res.json({ success: true, mensaje: 'Registro exitoso' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

app.post('/api/login/:tipo', (req, res) => {
    const { tipo } = req.params;
    const { email, password } = req.body;
    
    // Usar trabajadores.json en lugar de trabajador.json
    const archivo = `data/${tipo === 'trabajador' ? 'trabajadores' : tipo}.json`;
    
    try {
        if (!fs.existsSync(archivo)) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }
        
        const usuarios = JSON.parse(fs.readFileSync(archivo));
        const usuario = usuarios.find(u => u.email === email);
        
        if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }
        
        res.json({ 
            success: true, 
            mensaje: 'Login exitoso',
            usuario: { 
                nombre: usuario.nombre, 
                email: usuario.email, 
                especialidad: usuario.especialidad 
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

app.post('/api/solicitudes', (req, res) => {
    const solicitud = req.body;
    
    try {
        let solicitudes = [];
        if (fs.existsSync('data/solicitudes.json')) {
            solicitudes = JSON.parse(fs.readFileSync('data/solicitudes.json'));
        }
        
        const nuevaSolicitud = {
            ...solicitud,
            id: Date.now(),
            estado: 'pendiente',
            fecha: new Date().toISOString(),
            trabajadorAsignado: null
        };
        
        solicitudes.push(nuevaSolicitud);
        fs.writeFileSync('data/solicitudes.json', JSON.stringify(solicitudes, null, 2));
        
        res.json({ success: true, mensaje: 'Solicitud creada exitosamente', id: nuevaSolicitud.id });
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ success: false, mensaje: 'Error al crear solicitud' });
    }
});

app.get('/api/solicitudes', (req, res) => {
    try {
        let solicitudes = [];
        if (fs.existsSync('data/solicitudes.json')) {
            solicitudes = JSON.parse(fs.readFileSync('data/solicitudes.json'));
        }
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al obtener solicitudes' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`👥 Clientes: http://localhost:${PORT}/clientes/login`);
    console.log(`👷 Trabajadores: http://localhost:${PORT}/trabajadores/login`);
});
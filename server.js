const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'promanos_secreto_2025';

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));
// Alias para mantener referencias en HTML que usan /public/...
app.use('/public', express.static(path.join(__dirname, 'public')));
// Habilitar CORS (útil si frontend está desplegado en otra URL)
app.use(cors());

// Logger simple (temporal) para depurar peticiones que causan ENOENT en Render
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
    // El archivo `index.html` está en la raíz del proyecto (no dentro de `views/`)
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/clientes', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'clientes', 'index.html'));
});

// Servir dashboard y archivos estáticos dentro de las carpetas de views para rutas amigables
app.use('/clientes', express.static(path.join(__dirname, 'views', 'clientes')));
app.use('/trabajadores', express.static(path.join(__dirname, 'views', 'trabajador')));

app.get('/trabajadores', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'trabajador', 'dashboard.html'));
});

// API Routes
app.post('/api/registro/:tipo', (req, res) => {
    const { tipo } = req.params;
    const { nombre, email, password, especialidad, telefono } = req.body;
    
    const archivo = `data/${tipo}.json`;
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
            especialidad: especialidad || null,
            telefono: telefono || null,
            fechaRegistro: new Date().toISOString()
        };
        
        usuarios.push(nuevoUsuario);
        fs.writeFileSync(archivo, JSON.stringify(usuarios, null, 2));
        
        res.json({ success: true, mensaje: 'Registro exitoso' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    }
});

app.post('/api/login/:tipo', (req, res) => {
    const { tipo } = req.params;
    const { email, password } = req.body;
    
    const archivo = `data/${tipo}.json`;
    
    try {
        if (!fs.existsSync(archivo)) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }
        
        const usuarios = JSON.parse(fs.readFileSync(archivo));
        const usuario = usuarios.find(u => u.email === email);
        
        if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
            return res.status(400).json({ success: false, mensaje: 'Credenciales incorrectas' });
        }
        
        // Generar token
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, tipo: tipo }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            mensaje: 'Login exitoso', 
            token,
            usuario: { nombre: usuario.nombre, email: usuario.email, especialidad: usuario.especialidad }
        });
    } catch (error) {
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

// Fallback para servir la SPA / página principal en rutas desconocidas (si es GET servimos index.html)
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
}); 
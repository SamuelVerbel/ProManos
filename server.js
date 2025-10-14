const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// SERVIR ARCHIVOS HTML - RUTAS CORREGIDAS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Rutas para clientes
app.get('/clientes/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/login.html'));
});

app.get('/clientes/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/registro.html'));
});

app.get('/clientes/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/clientes/index.html'));
});

// Rutas para trabajadores - CORREGIDAS (trabajador en singular)
app.get('/trabajadores/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajador/login.html'));
});

app.get('/trabajadores/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajador/registro.html'));
});

app.get('/trabajadores/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/trabajador/dashboard.html'));
});

// API Routes
app.post('/api/registro/:tipo', (req, res) => {
    const { tipo } = req.params;
    const { nombre, email, password, especialidad, telefono, experiencia, descripcion } = req.body;
    
    const archivo = `data/${tipo}.json`;
    let usuarios = [];
    
    try {
        if (fs.existsSync(archivo)) {
            usuarios = JSON.parse(fs.readFileSync(archivo));
        }
        
        if (usuarios.find(u => u.email === email)) {
            return res.status(400).json({ success: false, mensaje: 'El usuario ya existe' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const nuevoUsuario = {
            id: Date.now(),
            nombre,
            email,
            password: hashedPassword,
            telefono: telefono || null,
            fechaRegistro: new Date().toISOString()
        };

        if (tipo === 'trabajadores') {
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
    console.log(`📊 Clientes: http://localhost:${PORT}/clientes/login.html`);
    console.log(`👷 Trabajadores: http://localhost:${PORT}/trabajadores/registro.html`);
});
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function writeIfMissing(filename, data) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Created ${filename}`);
  } else {
    console.log(`${filename} already exists, skipping`);
  }
}

const clientes = [
  { id: 1, nombre: 'Cliente Demo', email: 'cliente@demo.com', password: bcrypt.hashSync('cliente123', 10), telefono: '3000000000', fechaRegistro: new Date().toISOString() }
];

const trabajadores = [
  { id: 1, nombre: 'Trabajador Demo', email: 'trabajador@demo.com', password: bcrypt.hashSync('trabajador123', 10), especialidad: 'albañileria', telefono: '3001111111', fechaRegistro: new Date().toISOString() }
];

const solicitudes = [
  { id: 1, tipo: 'albañil', descripcion: 'Reparación de muro', direccion: 'Calle Demo 123', telefono: '3000000000', correo: 'cliente@demo.com', cliente: 'Cliente Demo', fecha: new Date().toISOString(), estado: 'pendiente', trabajadorAsignado: null }
];

writeIfMissing('clientes.json', clientes);
writeIfMissing('trabajadores.json', trabajadores);
writeIfMissing('solicitudes.json', solicitudes);

console.log('Init DB complete');

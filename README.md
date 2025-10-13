# ProManos — Albañiles

Proyecto minimal para conectar clientes con trabajadores (albañiles). Contiene backend en Node/Express y vistas HTML/JS en `views/` y `public/`.

Requisitos
- Node.js (>=16) y npm

Preparar localmente
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. (Opcional) Inicializar datos de ejemplo:
   ```bash
   node scripts/initDB.js
   ```
3. Ejecutar la app:
   ```bash
   npm run start
   ```

Rutas principales (local)
- Landing: http://localhost:3000/
- Clientes: http://localhost:3000/clientes/registro.html, /clientes/login.html, /clientes/index.html
- Trabajadores: http://localhost:3000/trabajadores/login.html, /trabajadores

Despliegue en Render
1. Sube el repo a GitHub.
2. En Render, crea un nuevo Web Service y conecta tu repo (rama `main`).
3. Start Command: `npm start` (Render detectará `package.json`).
4. Añade variables de entorno en Render: `JWT_SECRET` con un valor seguro.

Nota sobre Netlify
Si prefieres Netlify para la UI, despliega solo la parte estática y configura `window.API_BASE` en el HTML para apuntar a la URL de la API desplegada (en Render/Railway).

Si quieres, te guío paso a paso para subir a GitHub y conectar Render.

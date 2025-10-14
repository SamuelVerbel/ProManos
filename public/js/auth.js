class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('userData') || 'null');
    }

    async login(tipo, email, password) {
        try {
            // Para login de trabajadores usar 'trabajador' en la ruta pero 'trabajadores' en el archivo
            const tipoRuta = tipo === 'trabajadores' ? 'trabajador' : tipo;
            const response = await fetch(`/api/login/${tipoRuta}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.user = data.usuario;
                
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.usuario));
                localStorage.setItem('userType', tipo);
                
                return { success: true, user: data.usuario };
            } else {
                return { success: false, message: data.mensaje };
            }
        } catch (error) {
            return { success: false, message: 'Error de conexión' };
        }
    }

    async register(tipo, userData) {
        try {
            const tipoRuta = tipo === 'trabajadores' ? 'trabajador' : tipo;
            const response = await fetch(`/api/registro/${tipoRuta}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            return { success: false, mensaje: 'Error de conexión' };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userType');
        window.location.href = '/';
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUserType() {
        return localStorage.getItem('userType');
    }

    checkAuth(requiredType = null) {
        if (!this.isAuthenticated()) {
            window.location.href = '/';
            return false;
        }

        if (requiredType && this.getUserType() !== requiredType) {
            window.location.href = '/';
            return false;
        }

        return true;
    }
}

// Instancia global
const authManager = new AuthManager();

// Función para mostrar/ocultar contraseña
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling?.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon?.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon?.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: fadeInUp 0.5s ease-out;
    `;

    document.body.appendChild(notification);

    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
}

// Añadir animación fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
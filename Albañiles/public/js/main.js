// Pequeñas utilidades de UI
document.addEventListener('DOMContentLoaded', () => {
    // Agregar clase al body para estilos globales si hace falta
    document.body.classList.add('promanos-app');
});

// exportable si se usa en módulos (no usado actualmente)
function noop() {}

// placeholder para futuras funciones
window.promanos = { noop };

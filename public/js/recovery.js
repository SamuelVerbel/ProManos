// recovery.js - Funcionalidad para recuperación de contraseña

document.addEventListener('DOMContentLoaded', function() {
    const recoveryForm = document.getElementById('recoveryForm');
    const emailInput = recoveryForm.querySelector('input[type="email"]');
    const submitBtn = recoveryForm.querySelector('.btn');
    const modal = document.getElementById('confirmationModal');
    const modalCloseBtn = document.getElementById('modalClose');

    // Manejar envío del formulario
    recoveryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validar email
        if (!validateEmail(email)) {
            showMessage('Por favor ingresa un email válido', 'error');
            emailInput.focus();
            return;
        }
        
        // Enviar solicitud
        sendRecoveryRequest(email);
    });

    // Validación de email
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Simular envío de solicitud de recuperación
    function sendRecoveryRequest(email) {
        // Mostrar estado de carga
        setLoadingState(true);
        
        // Simular delay de red (en producción, esto sería una petición real)
        setTimeout(() => {
            // Aquí iría tu petición AJAX real
            console.log('Solicitud de recuperación para:', email);
            
            // Restaurar estado normal
            setLoadingState(false);
            
            // Mostrar modal de confirmación
            showConfirmationModal();
            
            // Limpiar formulario
            recoveryForm.reset();
            
        }, 2000);
    }

    // Controlar estado de carga
    function setLoadingState(loading) {
        if (loading) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            recoveryForm.classList.add('form-loading');
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            recoveryForm.classList.remove('form-loading');
        }
    }

    // Mostrar modal de confirmación
    function showConfirmationModal() {
        modal.style.display = 'flex';
    }

    // Cerrar modal
    function closeConfirmationModal() {
        modal.style.display = 'none';
        // Redirigir al login después de cerrar
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }

    // Event listeners para el modal
    modalCloseBtn.addEventListener('click', closeConfirmationModal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeConfirmationModal();
        }
    });

    // Función para mostrar mensajes
    function showMessage(message, type) {
        // Remover mensajes existentes
        const existingMessage = document.querySelector('.alert-recovery');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Crear nuevo mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert-recovery ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${getIconType(type)}"></i> ${message}
        `;
        
        // Insertar después del título
        const title = recoveryForm.previousElementSibling;
        title.parentNode.insertBefore(messageDiv, title.nextSibling);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Obtener icono según el tipo de mensaje
    function getIconType(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    // Validación en tiempo real
    emailInput.addEventListener('blur', function() {
        const email = emailInput.value.trim();
        if (email && !validateEmail(email)) {
            emailInput.style.borderColor = 'var(--danger)';
            showMessage('Por favor ingresa un email válido', 'warning');
        } else {
            emailInput.style.borderColor = '';
        }
    });

    // Limpiar mensajes al empezar a escribir
    emailInput.addEventListener('input', function() {
        const existingMessage = document.querySelector('.alert-recovery');
        if (existingMessage) {
            existingMessage.remove();
        }
        emailInput.style.borderColor = '';
    });
});
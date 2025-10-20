// recovery.js - Funcionalidad para recuperación de contraseña

document.addEventListener('DOMContentLoaded', function() {
    const recoveryForm = document.getElementById('recoveryForm');
    const emailInput = document.getElementById('email');
    const modal = document.getElementById('confirmationModal');
    const closeModal = document.querySelector('.close');
    const modalCloseBtn = document.getElementById('modalClose');

    // Manejar envío del formulario
    recoveryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!validateEmail(email)) {
            showMessage('Por favor ingresa un email válido', 'error');
            return;
        }
        
        // Simular envío de solicitud
        sendRecoveryRequest(email);
    });

    // Validación de email
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Simular envío de solicitud de recuperación
    function sendRecoveryRequest(email) {
        const submitBtn = recoveryForm.querySelector('.btn');
        
        // Mostrar estado de carga
        submitBtn.textContent = 'Enviando...';
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        // Simular delay de red
        setTimeout(() => {
            // En un caso real, aquí harías una petición a tu backend
            console.log('Solicitud de recuperación para:', email);
            
            // Restaurar botón
            submitBtn.textContent = 'Enviar Enlace de Recuperación';
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            // Mostrar modal de confirmación
            showConfirmationModal();
            
            // Limpiar formulario
            recoveryForm.reset();
            
        }, 2000);
    }

    // Mostrar modal de confirmación
    function showConfirmationModal() {
        modal.style.display = 'block';
    }

    // Cerrar modal
    function closeConfirmationModal() {
        modal.style.display = 'none';
    }

    // Event listeners para el modal
    closeModal.addEventListener('click', closeConfirmationModal);
    modalCloseBtn.addEventListener('click', closeConfirmationModal);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeConfirmationModal();
        }
    });

    // Función para mostrar mensajes
    function showMessage(message, type) {
        // Remover mensajes existentes
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Crear nuevo mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insertar después del h2
        const h2 = document.querySelector('h2');
        h2.parentNode.insertBefore(messageDiv, h2.nextSibling);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Validación en tiempo real
    emailInput.addEventListener('blur', function() {
        const email = emailInput.value.trim();
        if (email && !validateEmail(email)) {
            emailInput.style.borderColor = '#e74c3c';
        } else {
            emailInput.style.borderColor = '#ddd';
        }
    });
});
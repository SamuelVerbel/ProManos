class PasswordRecovery {
    constructor() {
        this.currentStep = 1;
        this.userEmail = '';
        this.verificationCode = '';
        this.timerInterval = null;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Formulario de email
        document.getElementById('emailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSubmit();
        });

        // Formulario de código
        document.getElementById('codeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCodeSubmit();
        });

        // Formulario de contraseña
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordSubmit();
        });

        // Inputs de código
        this.setupCodeInputs();

        // Validación de contraseñas en tiempo real
        document.getElementById('confirmPassword').addEventListener('input', () => {
            this.validatePasswordMatch();
        });

        // Botón reenviar código
        document.getElementById('resendBtn').addEventListener('click', () => {
            this.resendCode();
        });

        // Cerrar modal
        document.getElementById('successClose').addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    setupCodeInputs() {
        const inputs = document.querySelectorAll('.code-input');
        
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                // Marcar como llenado
                if (value) {
                    input.classList.add('filled');
                } else {
                    input.classList.remove('filled');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData.getData('text').slice(0, 6);
                pasteData.split('').forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].value = char;
                        inputs[i].classList.add('filled');
                    }
                });
                if (inputs[pasteData.length]) {
                    inputs[pasteData.length].focus();
                }
            });
        });
    }

    async handleEmailSubmit() {
        const email = document.getElementById('email').value.trim();
        
        if (!this.isValidEmail(email)) {
            this.showNotification('Por favor ingresa un email válido', 'error');
            return;
        }

        this.userEmail = email;
        
        try {
            // Mostrar loading
            const submitBtn = document.querySelector('#emailForm button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            const response = await fetch('/api/auth/send-recovery-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            if (data.success) {
                this.goToStep(2);
                this.startTimer();
                this.showNotification('Código enviado a tu email', 'success');
            } else {
                this.showNotification(data.mensaje || 'Error al enviar el código', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
        }
    }

    async handleCodeSubmit() {
        const code = this.getCodeFromInputs();
        
        if (code.length !== 6) {
            this.showNotification('Por favor ingresa el código completo', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/verify-recovery-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: this.userEmail, 
                    code: code 
                })
            });

            const data = await response.json();

            if (data.success) {
                this.verificationCode = code;
                this.goToStep(3);
                this.showNotification('Código verificado correctamente', 'success');
            } else {
                this.showNotification(data.mensaje || 'Código inválido', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
        }
    }

    async handlePasswordSubmit() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!this.validatePasswordMatch()) {
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    code: this.verificationCode,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccessModal();
            } else {
                this.showNotification(data.mensaje || 'Error al cambiar la contraseña', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
        }
    }

    getCodeFromInputs() {
        const inputs = document.querySelectorAll('.code-input');
        let code = '';
        inputs.forEach(input => {
            code += input.value;
        });
        return code;
    }

    async resendCode() {
        try {
            const response = await fetch('/api/auth/resend-recovery-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: this.userEmail })
            });

            const data = await response.json();

            if (data.success) {
                this.startTimer();
                this.showNotification('Código reenviado', 'success');
            } else {
                this.showNotification(data.mensaje || 'Error al reenviar el código', 'error');
            }
        } catch (error) {
            this.showNotification('Error de conexión', 'error');
        }
    }

    startTimer() {
        let timeLeft = 60;
        const timerElement = document.getElementById('countdown');
        const resendBtn = document.getElementById('resendBtn');

        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                resendBtn.disabled = false;
                resendBtn.style.opacity = '1';
                timerElement.parentElement.style.display = 'none';
            }
        }, 1000);
    }

    goToStep(step) {
        // Ocultar todos los formularios
        document.querySelectorAll('.recovery-form').forEach(form => {
            form.classList.remove('active');
        });

        // Actualizar pasos
        document.querySelectorAll('.step').forEach((stepElement, index) => {
            stepElement.classList.remove('active', 'completed');
            if (index + 1 < step) {
                stepElement.classList.add('completed');
            } else if (index + 1 === step) {
                stepElement.classList.add('active');
            }
        });

        // Mostrar formulario actual
        document.getElementById(`${this.getFormId(step)}`).classList.add('active');
        
        this.currentStep = step;
    }

    getFormId(step) {
        const forms = {
            1: 'emailForm',
            2: 'codeForm',
            3: 'passwordForm'
        };
        return forms[step];
    }

    validatePasswordMatch() {
        const password = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const messageElement = document.getElementById('passwordMatch');

        if (confirm === '') {
            messageElement.textContent = '';
            messageElement.className = 'validation-message';
            return false;
        }

        if (password !== confirm) {
            messageElement.textContent = 'Las contraseñas no coinciden';
            messageElement.className = 'validation-message error';
            return false;
        } else {
            messageElement.textContent = 'Las contraseñas coinciden';
            messageElement.className = 'validation-message success';
            return true;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showNotification(message, type = 'success') {
        // Usar la función showNotification de auth.js si existe
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Implementación básica si no existe
            alert(`${type === 'error' ? 'Error: ' : ''}${message}`);
        }
    }

    showSuccessModal() {
        document.getElementById('successModal').classList.add('active');
    }

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.parentElement.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PasswordRecovery();
});

// Funciones globales para los onclick
function goToStep(step) {
    if (window.passwordRecovery) {
        window.passwordRecovery.goToStep(step);
    }
}

function togglePassword(inputId) {
    if (window.passwordRecovery) {
        window.passwordRecovery.togglePassword(inputId);
    }
}

// Hacer la instancia global para las funciones onclick
window.passwordRecovery = new PasswordRecovery();
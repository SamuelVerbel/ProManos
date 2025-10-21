// recovery.js - Sistema completo de recuperación de contraseña
class PasswordRecovery {
    constructor() {
        this.currentStep = 1;
        this.userEmail = '';
        this.timerInterval = null;
        this.timeLeft = 60;
        this.verificationCode = '';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showStep(1);
        this.setupCodeInputs();
    }

    setupEventListeners() {
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

        // Botón de reenviar código
        document.getElementById('resendBtn').addEventListener('click', () => {
            this.resendCode();
        });

        // Validación de contraseñas en tiempo real
        document.getElementById('confirmPassword').addEventListener('input', () => {
            this.validatePasswords();
        });
    }

    setupCodeInputs() {
        const codeInputs = document.querySelectorAll('.code-input');
        
        codeInputs.forEach((input, index) => {
            // Mover al siguiente input automáticamente
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1) {
                    if (index < codeInputs.length - 1) {
                        codeInputs[index + 1].focus();
                    }
                    e.target.classList.add('filled');
                } else {
                    e.target.classList.remove('filled');
                }
                
                // Verificar si todos los campos están llenos
                this.checkCodeCompletion();
            });

            // Permitir borrar con Backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });

            // Prevenir pegado
            input.addEventListener('paste', (e) => {
                e.preventDefault();
            });
        });
    }

    checkCodeCompletion() {
        const codeInputs = document.querySelectorAll('.code-input');
        const code = Array.from(codeInputs).map(input => input.value).join('');
        
        if (code.length === 6) {
            this.verificationCode = code;
        }
    }

    async handleEmailSubmit() {
        const email = document.getElementById('email').value.trim();
        const submitBtn = document.querySelector('#emailForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        if (!this.isValidEmail(email)) {
            this.showMessage('Por favor ingresa un email válido', 'error');
            return;
        }

        try {
            // Mostrar loading
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

            const response = await fetch('/api/password-reset/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                this.userEmail = email;
                document.getElementById('userEmail').textContent = email;
                this.showMessage('✅ Código enviado a tu email', 'success');
                this.startTimer();
                this.showStep(2);
                
                // Guardar el código para desarrollo (quitar en producción)
                if (data.resetToken) {
                    console.log('Código de desarrollo:', data.resetToken);
                }
            } else {
                this.showMessage(data.message || 'Error al enviar el código', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error de conexión', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleCodeSubmit() {
        const codeInputs = document.querySelectorAll('.code-input');
        const code = Array.from(codeInputs).map(input => input.value).join('');
        const submitBtn = document.querySelector('#codeForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        if (code.length !== 6) {
            this.showMessage('Por favor ingresa el código completo de 6 dígitos', 'error');
            return;
        }

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            submitBtn.disabled = true;

            const response = await fetch('/api/password-reset/verify', {
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
                this.showMessage('✅ Código verificado correctamente', 'success');
                this.showStep(3);
                this.stopTimer();
            } else {
                this.showMessage(data.message || 'Código incorrecto', 'error');
                // Limpiar inputs
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                codeInputs[0].focus();
            }

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error de conexión', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handlePasswordSubmit() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = document.querySelector('#passwordForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Validaciones
        if (newPassword.length < 6) {
            this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return;
        }

        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            submitBtn.disabled = true;

            const response = await fetch('/api/password-reset/reset', {
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
                this.showMessage('✅ Contraseña actualizada correctamente', 'success');
                
                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                    window.location.href = '/clientes/login.html';
                }, 2000);
            } else {
                this.showMessage(data.message || 'Error al cambiar la contraseña', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error de conexión', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async resendCode() {
        try {
            const response = await fetch('/api/password-reset/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: this.userEmail })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('✅ Nuevo código enviado', 'success');
                this.startTimer();
                
                // Limpiar inputs y enfocar el primero
                const codeInputs = document.querySelectorAll('.code-input');
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                codeInputs[0].focus();
            } else {
                this.showMessage(data.message || 'Error al reenviar el código', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('❌ Error de conexión', 'error');
        }
    }

    startTimer() {
        this.timeLeft = 60;
        const timerElement = document.getElementById('countdown');
        const resendBtn = document.getElementById('resendBtn');
        
        this.stopTimer(); // Limpiar timer anterior
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            timerElement.textContent = this.timeLeft;
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                resendBtn.disabled = false;
                timerElement.style.display = 'none';
            }
        }, 1000);
        
        resendBtn.disabled = true;
        timerElement.style.display = 'inline';
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showStep(stepNumber) {
        this.currentStep = stepNumber;
        
        // Ocultar todos los formularios
        document.querySelectorAll('.recovery-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // Mostrar formulario actual
        document.getElementById(
            stepNumber === 1 ? 'emailForm' : 
            stepNumber === 2 ? 'codeForm' : 'passwordForm'
        ).classList.add('active');
        
        // Actualizar pasos
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        // Enfocar el primer input del paso actual
        setTimeout(() => {
            if (stepNumber === 1) {
                document.getElementById('email').focus();
            } else if (stepNumber === 2) {
                document.querySelector('.code-input').focus();
            } else if (stepNumber === 3) {
                document.getElementById('newPassword').focus();
            }
        }, 300);
    }

    validatePasswords() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const messageElement = document.getElementById('passwordMatch');
        
        if (confirmPassword === '') {
            messageElement.textContent = '';
            messageElement.className = 'validation-message';
            return;
        }
        
        if (newPassword === confirmPassword) {
            messageElement.textContent = '✅ Las contraseñas coinciden';
            messageElement.className = 'validation-message success';
        } else {
            messageElement.textContent = '❌ Las contraseñas no coinciden';
            messageElement.className = 'validation-message error';
        }
    }

    showMessage(message, type = 'info') {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.className = `alert alert-${type}`;
        messageElement.style.display = 'block';
        
        // Auto-ocultar mensajes de éxito después de 5 segundos
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    goToStep(step) {
        this.showStep(step);
    }
}

// Función global para mostrar/ocultar contraseña
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentNode.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Función global para cambiar de paso (usada en el HTML)
function goToStep(step) {
    if (window.passwordRecovery) {
        window.passwordRecovery.goToStep(step);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.passwordRecovery = new PasswordRecovery();
});
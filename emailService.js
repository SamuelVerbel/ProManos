// emailService.js
const nodemailer = require('nodemailer');

// Configuración del transporter
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'promanoscommunity@gmail.com',
        pass: 'bphbibayvocamcsi' // ← LA QUE COPIAS
    }
});

// Función para enviar código de verificación
async function sendVerificationEmail(email, verificationCode) {
    try {
        const mailOptions = {
            from: '"ProManos Community" <promanoscommunity@gmail.com>',
            to: email,
            subject: '🔐 Código de Recuperación - ProManos',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0;">ProManos</h1>
                        <p style="margin: 10px 0 0 0;">Plataforma de Servicios</p>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #333;">Recuperación de Contraseña</h2>
                        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                            <p style="font-size: 14px; color: #666;">Tu código de verificación es:</p>
                            <div style="font-size: 32px; font-weight: bold; color: #ff7b00; letter-spacing: 5px; margin: 15px 0;">
                                ${verificationCode}
                            </div>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            ⏰ Este código expira en <strong>15 minutos</strong>.<br>
                            🔒 Si no solicitaste este código, ignora este mensaje.
                        </p>
                    </div>
                    
                    <div style="background: #2c3e50; padding: 20px; text-align: center; color: white; font-size: 12px;">
                        <p>© 2024 ProManos Community. Todos los derechos reservados.</p>
                        <p>Cartagena, Colombia</p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado a:', email);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return { success: false, error: error.message };
    }
}

// Función para enviar confirmación de cambio
async function sendPasswordChangedEmail(email) {
    const mailOptions = {
        from: '"ProManos Community" <promanoscommunity@gmail.com>',
        to: email,
        subject: '✅ Contraseña Actualizada - ProManos',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0;">¡Contraseña Actualizada!</h1>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <p>Hola,</p>
                    <p>Tu contraseña en <strong>ProManos</strong> ha sido actualizada exitosamente.</p>
                    
                    <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;">✅ Cambio realizado: ${new Date().toLocaleString('es-CO')}</p>
                    </div>
                    
                    <p>Si no realizaste este cambio, por favor contacta a soporte inmediatamente.</p>
                </div>
                
                <div style="background: #2c3e50; padding: 20px; text-align: center; color: white; font-size: 12px;">
                    <p>© 2024 ProManos Community</p>
                </div>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = {
    sendVerificationEmail,
    sendPasswordChangedEmail
};
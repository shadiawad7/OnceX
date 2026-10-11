export type RegistrationInput = { name: string; email: string; password: string; confirmation: string };

export function validateRegistration(input: RegistrationInput): string | null {
  if (!input.name.trim()) return 'Introduce tu nombre.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Introduce un email válido.';
  if (input.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (input.password !== input.confirmation) return 'Las contraseñas no coinciden.';
  return null;
}

export function authErrorMessage(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'invalid_credentials': return 'El email o la contraseña no son correctos.';
    case 'email_not_confirmed': return 'Confirma tu email antes de iniciar sesión.';
    case 'user_already_exists': case 'email_exists': return 'Ese email ya está registrado. Inicia sesión.';
    case 'weak_password': return 'Elige una contraseña más segura.';
    case 'signup_disabled': return 'El registro no está disponible en este momento.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    default: return 'No hemos podido completar la solicitud. Comprueba tu conexión e inténtalo de nuevo.';
  }
}

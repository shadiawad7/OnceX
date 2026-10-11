# Configurar el registro de ONCEX

1. Crea un proyecto en https://supabase.com/dashboard y espera a que termine de iniciarse.
2. En el diálogo **Connect**, copia la URL del proyecto y la clave **publishable** (o la clave pública legacy **anon**).
3. Copia `.env.example` a `.env.local` y sustituye ambos valores. Nunca uses una clave `service_role` o secreta en variables `EXPO_PUBLIC_*`.
4. En **Authentication → Providers → Email**, activa el registro por email y la confirmación de correo. Configura el **Site URL** de confirmación en **Authentication → URL Configuration** con una URL web válida que controles. El usuario confirma en el navegador y después vuelve a ONCEX para iniciar sesión; esta versión no usa un callback móvil automático.
5. Reinicia Expo con `npm run start:tunnel`.
6. Desde «REGISTRARSE», crea una cuenta de prueba, confirma su email y comprueba el inicio de sesión. Revisa el usuario creado en **Authentication → Users**.

El nombre se envía como `user_metadata.full_name` a Supabase Auth. Aplica la [migración de usuarios y roles](supabase-roles.md) para crear perfiles públicos y asignar automáticamente el rol Jugador.

Las sesiones se conservan y renuevan con Supabase. La app consulta el nombre y los roles reales de la cuenta; los permisos se comprueban en la base de datos. La pantalla principal sigue mostrando estadísticas y partidos ficticios.

Si desactivas la confirmación de email, Supabase puede devolver una sesión inmediatamente después del registro y la app abrirá la pantalla principal. No se puede verificar el registro real hasta configurar un proyecto.

Documentación: https://supabase.com/docs/guides/auth/quickstarts/react-native

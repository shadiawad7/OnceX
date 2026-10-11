# Usuarios y permisos de ONCEX

La migración `supabase/migrations/202610100001_users_roles.sql` crea ocho tablas:

- `profiles`: nombre e identificador, vinculado a `auth.users`. Supabase Auth gestiona email y contraseña; no duplicamos contraseñas en tablas públicas.
- `roles`, `permissions`, `role_permissions`: catálogo de roles y privilegios.
- `user_roles`: asignaciones globales o por club. Una persona puede tener roles diferentes en clubes diferentes.
- `clubs`, `teams`, `team_members`: clubes, equipos y pertenencia de jugadores y entrenadores.

| Rol | Alcance y acciones |
| --- | --- |
| Super Admin | Todos los clubes, equipos y asignaciones de roles. |
| Club Admin | Equipos y miembros de sus clubes; asigna jugadores y entrenadores. No asigna administradores. |
| Entrenador | Consulta sus equipos, plantillas y perfiles de sus integrantes. |
| Jugador | Consulta su perfil, clubes y equipos asignados. |

Todos pueden editar su propio nombre. Un nuevo registro recibe automáticamente un perfil y el rol Jugador sin club. El trigger también incorpora cuentas registradas antes de la migración. Se ignoran roles enviados en los metadatos del registro.

Los permisos se aplican en PostgreSQL mediante RLS, restricciones de columnas y claves foráneas. Cambiar una URL, parámetro de navegación o dato en la app no concede privilegios. Mantén el esquema `private` fuera de los esquemas expuestos por la API. Las estadísticas y partidos de la pantalla principal siguen siendo datos de demostración; esta migración no crea todavía el modelo deportivo.

## Aplicar en tu proyecto

Opción sencilla: abre el proyecto `gyfnjyvqqrmjojarvklp` en Supabase → **SQL Editor → New query**, copia todo el archivo de migración y pulsa **Run** una sola vez. Se ejecuta como transacción: si falla, no deja tablas creadas a medias. Revisa luego **Table Editor**.

Alternativa con CLI: inicia sesión con `supabase login`, configura el proyecto local y vincula el proyecto con `supabase link --project-ref gyfnjyvqqrmjojarvklp`. Revisa el destino y las migraciones pendientes antes de `supabase db push`. La clave pública de `.env.local` no permite ejecutar DDL; necesitas acceso administrativo. Nunca coloques credenciales administrativas en variables `EXPO_PUBLIC_*`.

La app ahora consulta `profiles` y `user_roles`; hasta aplicar la migración mostrará un mensaje de perfil no disponible. El registro sigue creando cuentas de Supabase Auth, pero no habrá perfiles públicos hasta ejecutar el SQL.

## Primer administrador

Registra y confirma primero tu cuenta. Ejecuta este bloque **desde SQL Editor como propietario** y sustituye únicamente el email. El bloque aborta si la cuenta no existe. Solo un operador de confianza debe hacer este paso; no se llama desde la app.

```sql
do $$
declare
  target_id uuid;
begin
  select id into target_id from auth.users
  where lower(email) = lower('TU_EMAIL_AQUI');
  if target_id is null then
    raise exception 'Registra y confirma primero la cuenta indicada';
  end if;
  insert into public.user_roles(user_id, role_code)
  values (target_id, 'super_admin')
  on conflict (user_id, role_code) where club_id is null do nothing;
end $$;
```

Para asignar Club Admin, un Super Admin inserta `user_roles` con `role_code = 'club_admin'`, el UUID de la cuenta y el UUID del club. Para asignar Entrenador o Jugador a un equipo, primero asigna su rol dentro del club y después inserta `team_members` con ese mismo club y rol. Las cuentas con rol global Super Admin entran automáticamente en `/admin`. Allí pueden gestionar clubes, equipos, nombres de cuentas, roles, plantillas y planes; el resto de cuentas conserva su pantalla principal. No se permite retirar el rol Super Admin desde esta interfaz para evitar perder accidentalmente el acceso administrativo. Las cuentas de Auth se crean por registro: la interfaz no crea ni borra credenciales de Supabase Auth.

## Pruebas

`supabase/tests/users_roles.sql` se ejecuta como propietario en una base de pruebas con la migración aplicada. Crea cuentas de prueba dentro de una transacción y hace rollback al terminar. Comprueba alta automática, metadatos maliciosos, aislamiento entre clubes, lectura por equipo, edición del nombre, restricciones de identidad, escalada de roles y acceso anónimo. No lo ejecutes en producción; usa una base local de pruebas.

Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [gestión de usuarios](https://supabase.com/docs/guides/auth/managing-user-data).

## Extensión del Super Admin

Después de aplicar la primera migración, ejecuta **una vez** `supabase/migrations/202610100002_super_admin.sql` en SQL Editor. No vuelvas a ejecutar la primera migración si ya está aplicada.

El rol `super_admin` tiene siempre `club_id = NULL`. No necesita una pertenencia a cada club para consultar o administrar los existentes y los que se creen en el futuro. Su panel usa paginación y búsqueda para consultar todas las cuentas y entidades, sin limitarse a un club seleccionado.

La segunda migración permite al Super Admin editar nombres de otros perfiles, añade `plans` y `club_subscriptions`, y registra automáticamente altas, modificaciones y bajas en `activity_log`. El registro de actividad es de solo lectura para la app. No se pueden alterar ni fabricar eventos desde el panel. Los eventos identifican la cuenta que realiza la operación, la entidad, la acción y la fecha; no guardan contraseñas, emails ni el contenido de los perfiles.

Los planes son un catálogo mensual en EUR y se asignan a los clubes al guardar su ficha. No se realizan cobros ni se integra todavía un proveedor de pagos. La interfaz permite activar/desactivar planes y cambiar el plan asignado; el estado de la suscripción se conserva al cambiar de plan. La gestión del ciclo de facturación queda para la integración de pagos.

El SQL se ha comprobado en PostgreSQL local, incluyendo aislamiento entre roles, asignación de planes en varios clubes, registro automático de actividad y guardado atómico de club y plan. No se ha aplicado al proyecto remoto por falta de acceso administrativo.

## No se puede crear un club desde el panel

Si `clubs` existe pero la API devuelve `PGRST205` para `club_subscriptions`, la segunda migración está pendiente o sus tablas aún no figuran en la caché de la API. Ejecuta `202610100002_super_admin.sql` completa en **SQL Editor** una vez, después de la primera migración. Ese archivo crea las tablas de planes y la función de guardado de clubes. No hace falta cambiar la clave pública ni desactivar RLS.

Si ya ejecutaste la segunda migración correctamente y las tablas aparecen en Table Editor, recarga únicamente la caché con `NOTIFY pgrst, 'reload schema';` en SQL Editor. Vuelve al formulario y pulsa Reintentar.

## Jerarquía y nuevas cuentas

La migración 003 y la función `create-account` amplían este modelo con administrador de equipo y altas con email/contraseña. Consulta [la guía de jerarquía y despliegue](hierarchy-accounts.md) antes de usar esos formularios. Las limitaciones anteriores sobre crear credenciales desde el panel quedan sustituidas por este flujo servidor.

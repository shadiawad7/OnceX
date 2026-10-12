# Equipos sin cuenta propia

El alta de equipos pide solo nombre y categoría, y los guarda directamente dentro del club con los permisos de Supabase. No crea usuarios Auth ni solicita email/contraseña. El entrenador se da de alta dentro del equipo con su email y contraseña; desde su panel gestiona ese equipo y sus jugadores.

Aplica una vez `202610100004_coach_manages_team.sql`, después de la migración 003, para permitir al entrenador editar el nombre y categoría de sus equipos. No hace falta volver a desplegar la función para crear equipos. Las cuentas de equipo existentes se conservan, pero ya no se crean nuevas desde el formulario.

## Modelo anterior y configuración de altas

La navegación sigue esta jerarquía: **club → equipo → entrenador → jugadores**. Crear un club no crea equipos; crear un equipo no crea entrenadores ni jugadores. Las altas de clubes, entrenadores y jugadores solicitan nombre, email, contraseña y confirmación. Los equipos solo requieren nombre y categoría valenciana.

El email y la contraseña corresponden a una cuenta de acceso del responsable del club o equipo, o a la persona entrenador/jugador. Las contraseñas se guardan únicamente mediante Supabase Auth, nunca en las tablas públicas. Crear una cuenta no cierra ni sustituye la sesión de quien realiza el alta.

| Cuenta | Pantalla y permisos |
| --- | --- |
| Super Admin | Panel global: crea clubes y puede operar en toda la jerarquía. |
| Club Admin | Panel de sus clubes: entra en ellos y crea equipos dentro de su club. |
| Administrador de equipo | Panel de sus equipos: edita el equipo y crea entrenadores dentro de él. |
| Entrenador | Panel de sus equipos: entra en su ficha y crea jugadores asociados a él. |
| Jugador | Panel de sus equipos: consulta su perfil y entrenadores; no crea cuentas. |

Los administradores superiores pueden crear entrenadores y jugadores dentro de su ámbito. Un entrenador no puede crear cuentas para otro equipo, crear otro entrenador, o asignar sus altas de jugadores a otro entrenador. El rol de administrador de equipo solo tiene acceso a los equipos a los que está vinculado, aunque otro equipo pertenezca al mismo club.

El catálogo global de equipos ya no aparece como entrada independiente del panel de Super Admin. Se abre desde cada club. Las vistas globales de usuarios, entrenadores, jugadores, planes y actividad siguen disponibles para el Super Admin. Dentro de cada equipo se puede alternar entre entrenadores y jugadores.

## Activar en Supabase

1. Aplica las migraciones 001 y 002 si aún están pendientes. No vuelvas a ejecutar las ya aplicadas.
2. Ejecuta completa **`supabase/migrations/202610100003_hierarchy_accounts.sql`** en SQL Editor una vez.
3. Desde la raíz de este proyecto, inicia sesión en la CLI y despliega la función:

```sh
supabase login
supabase functions deploy create-account --project-ref gyfnjyvqqrmjojarvklp --no-verify-jwt
```

El flag desactiva la comprobación antigua del gateway; la función verifica explícitamente el token con `auth.getUser(token)` y consulta los permisos antes de crear la cuenta. Las peticiones sin una sesión válida se rechazan. No elimines esa verificación de la función.

Supabase proporciona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` dentro de su entorno de Edge Functions. No copies la clave administrativa a `.env.local` ni a ninguna variable `EXPO_PUBLIC_*`. No se necesita cambiar la clave pública que usa la app.

La función crea la cuenta con email confirmado para permitir acceso inmediato usando la contraseña introducida por el operador autorizado. Entrega esas credenciales al destinatario por un canal adecuado. Este flujo no envía invitaciones ni emails de contraseña. El registro público existente sigue requiriendo confirmación según la configuración de Auth.

La función comprueba los permisos antes de llamar a Auth y vuelve a comprobarlos al vincular los datos. Todas las asignaciones de base de datos se hacen en una transacción. Si falla esa vinculación, se intenta eliminar la cuenta recién creada; un fallo de esa compensación se registra para revisión administrativa. Auth y PostgreSQL son operaciones distintas, por lo que no constituyen una única transacción distribuida.

## Datos existentes

Los clubes, equipos y personas existentes se conservan. La migración no les crea emails ni cambia sus contraseñas. Los equipos existentes siguen visibles y se pueden gestionar desde su club; no reciben automáticamente una nueva cuenta de administrador de equipo.

`team_members.coach_id` asocia las altas nuevas de jugadores a su entrenador. Los jugadores anteriores sin esa asociación siguen visibles en la pestaña Jugadores del equipo. No se asignan arbitrariamente a un entrenador.

Si una cuenta tiene varios roles, `/home` abre el panel del de mayor prioridad: Super Admin, Club Admin, Administrador de equipo, Entrenador, Jugador. Los perfiles nuevos creados por este flujo reciben el rol correspondiente; se retira su rol Jugador global automático si no son jugadores.

Eliminar un club o equipo desde su ficha elimina sus relaciones vinculadas, pero conserva las cuentas Auth y perfiles personales. Esta versión no implementa borrado de credenciales ni restablecimiento de contraseña desde el panel.

## Verificación

Las pruebas SQL `users_roles.sql`, `super_admin.sql` y `hierarchy_accounts.sql` comprueban RLS, aislamiento, creación de clubes y equipos, roles, pertenencias y asociaciones de jugadores a sus entrenadores en una base local aislada. `node supabase/tests/create-account.test.cjs` ejecuta la función real con un SDK simulado para probar validación de sesión, permisos antes de crear cuentas, identidad verificada, errores, email duplicado y compensación. No sustituye una prueba de integración con Supabase Auth real y la función desplegada.

Referencias: [Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth), [despliegue](https://supabase.com/docs/guides/functions/deploy).

## Posición del jugador

Aplica `202610100005_player_position.sql` una vez después de las anteriores. Añade la posición al perfil. Las listas de jugadores muestran el nombre y debajo, en tamaño pequeño, su club y posición. En el panel global Jugadores se edita la posición al abrir una ficha. Los jugadores sin datos muestran «Sin club asignado» o «Posición sin definir»; no se inventan valores.

### Fichas de jugadores

Después de la migración `202610100005_player_position.sql`, ejecuta
`supabase/migrations/202610100006_player_details.sql` en el SQL Editor de Supabase.
No requiere desplegar de nuevo la función de altas.

Desde el equipo o el entrenador, entra en un jugador para editar nombre,
posición y fecha de nacimiento (DD/MM/AAAA).
La edad se calcula automáticamente. El formulario no solicita rol deportivo.
El entrenador solo puede editar jugadores cuyo `coach_id` sea su usuario y
pertenezcan a un equipo donde figure como entrenador. Los administradores
mantienen sus permisos dentro de su ámbito. Las políticas RLS comprueban el
guar­dado también en la base de datos. Si falta la migración, se sigue mostrando
el nombre del jugador y un aviso de activación pendiente.

### Ranking ONCEX y selectores

Ejecuta `supabase/migrations/202610100007_player_rankings.sql` después de las
migraciones 005 y 006. La página del jugador muestra el ranking del club con
podio y filtros de equipo, posición y categoría, siguiendo la página 5 de
`ONCEX.pdf`. Los entrenadores acceden desde «VER RANKINGS ONCEX».

La posición se elige en una lista. La fecha de nacimiento
se elige en un calendario con selección directa de mes y año, disponible tanto
en móvil como en web sin dependencias nativas adicionales.

El ONCEX Score dependerá de las actuaciones del jugador en los partidos.
Su cálculo todavía está pendiente de definir e implementar. El formulario
no permite introducir ni editar la puntuación ni pide el pie dominante.
La posición se limita a Portero, Defensa, Centrocampista y Delantero.
Ejecuta `supabase/migrations/202610110001_disable_manual_score.sql` después
de la migración 007 para retirar también el permiso de valoración manual
mediante la API. Esta migración conserva las puntuaciones ya existentes.
La puntuación pertenece al perfil general del jugador. Los jugadores sin
valoración se muestran como «Sin evaluar» y no ocupan un puesto en el podio.
Los empates comparten puesto (por ejemplo, 1, 1, 3). Un jugador que pertenece
a varios equipos aparece una sola vez dentro del filtro elegido.

La función `club_player_rankings` comparte exclusivamente nombre, equipo,
categoría, posición y Score con miembros autenticados del mismo club y con
el superadministrador. No expone fechas de nacimiento. La escritura manual mediante
`set_player_score` queda desactivada para las cuentas de la aplicación.

### Fotos y diseño del ranking (página 5 del PDF)

Ejecuta `supabase/migrations/202610110002_profile_photos.sql` después de las
migraciones anteriores. Crea el bucket privado `profile-photos`, los permisos,
la vinculación de la foto a `profiles.photo_path` y añade la foto al ranking.
No requiere volver a desplegar la Edge Function de altas.

En «Crear entrenador» y «Crear jugador», «AÑADIR FOTO» permite seleccionar
una imagen JPG, PNG o WebP (máximo 5 MB), verla antes del alta y cambiarla.
La cuenta se crea primero y después se sube la foto mediante la sesión del
administrador o entrenador. Si falla la subida, «REINTENTAR GUARDAR FOTO»
reutiliza la cuenta ya creada; no genera una cuenta duplicada. La foto es
opcional. Las cuentas existentes sin foto se muestran con sus iniciales.

Las imágenes se leen con URLs firmadas de una hora y se renuevan al volver
al ranking. Se comparte únicamente la foto entre miembros del mismo club.
Los permisos de escritura se limitan a la propia cuenta y a los administradores
o entrenadores autorizados para esa ficha. Las fotos de entrenadores también
se muestran al entrar en su ficha.

El dashboard del jugador no muestra «MIS EQUIPOS». El ranking utiliza tarjetas
metálicas oro/plata/bronce, el ganador en el centro, retratos grandes, medallas,
corona, panel ONCEX Score, columnas separadas de jugador/equipo/posición/Score
con miniaturas y puntuaciones verdes o azules. Sin puntuaciones calculadas
desde partidos, se muestran los jugadores en la tabla y se omite el podio.

Comprobaciones: lint, TypeScript y `supabase/tests/profile_photos.sql`, con
pruebas de subida autorizada, lectura dentro del club, bloqueo de otras cuentas
y vinculación al ranking. Las pruebas SQL locales usan tablas Storage simuladas;
la subida real desde galería requiere aplicar la migración al proyecto Supabase.

### Alta completa y ficha de consulta del jugador

Ejecuta `supabase/migrations/202610110003_player_registration.sql` después de
la migración de fotos. Añade `profiles.jersey_number` (1–99) y retira la edición
propia de ficha y foto para las cuentas que solo tienen el rol jugador.
Los entrenadores y administradores conservan la edición dentro de su ámbito.

En el alta del jugador se completan foto, posición, fecha de nacimiento y dorsal,
además de nombre y credenciales. Si falla el guardado de la ficha o de la foto,
se puede reintentar con la cuenta ya creada. Equipo y categoría se obtienen de
la asignación al equipo. Actualmente el dorsal se guarda en el perfil general.
La ficha no muestra el formulario de edición a una cuenta de jugador.
La prueba `supabase/tests/player_registration.sql` comprueba que el entrenador
puede guardar el dorsal y que el jugador no modifica su ficha ni su foto.

# Corrección para permisos de pg_cron alojado — 2026-10-31

**LISTO PARA REINTENTAR DRY-RUN.** No autoriza push ni despliegue. No se ha ejecutado nada remoto.

## Causa y corrección del ensayo

La versión anterior falló en LOCK TABLE cron.job. Supabase aloja esa tabla bajo supabase_admin y postgres no es superusuario: SELECT no permite SHARE ROW EXCLUSIVE. current_user=postgres verifica identidad, no privilegios de superusuario/propietario. El ensayo anterior con postgres como bootstrap superusuario no modelaba esta restricción; su dictamen se sustituye por este informe.

Referencias primarias:
- https://supabase.com/kb/troubleshooting/revoking-privileges-on-storage-pg_cron-vault-and-extension-objects-has-no-effect
- https://github.com/supabase/postgres/blob/develop/migrations/db/migrations/20260730000000_revoke_trigger_on_cron_tables_from_postgres.sql
- https://github.com/citusdata/pg_cron/blob/v1.6.4/src/job_metadata.c (ScheduleCronJob, rama jobnameText==NULL: INSERT sin ON CONFLICT).

## Solución

No se solicita ni amplía ningún permiso administrado. Se elimina el LOCK incompatible y se cambia el mecanismo de registro para que no necesite ese permiso:

- pg_advisory_xact_lock serializa las aplicaciones de esta migración dentro de la transacción. Su clave es constante de ONCEX, no elegida por cliente.
- La tabla nueva private.ai_match_cleanup_job tiene una fila singleton y registra el job_id. RLS habilitado, sin acceso de PUBLIC/anon/authenticated/service_role. La creación de los objetos más el bloqueo serializan dos migraciones concurrentes: una sola completa y programa el job.
- Se conserva la guarda de colisiones: registro propio ya existente, job de nombre legado o comando de limpieza ya presente hacen abortar antes de sustituir nada.
- Se usa exclusivamente cron.schedule(horario,comando) con DOS argumentos. Esta API de pg_cron crea un job SIN nombre y no realiza el upsert de la API con nombre; por construcción no puede sobrescribir el trabajo de otro escritor, aunque este no respete nuestro advisory lock.
- job_id queda registrado atómicamente junto a las tablas/funciones de IA. No se hacen INSERT/UPDATE/DELETE/ALTER/LOCK sobre cron.job, ni se cambia su propietario, grants o políticas. Cron se consulta con SELECT y se administra únicamente mediante su API.
- El job no se localizará por el nombre antiguo: unir cron.job con private.ai_match_cleanup_job mediante job_id. El helper y el horario de limpieza siguen siendo los mismos.

Un administrador aún puede crear deliberadamente otro trabajo distinto; el advisory lock no pretende bloquear todos los escritores de cron. La garantía es que esta migración no sobrescribe jobs ajenos y que dos aplicaciones de ella no crean dos registros/jobs propios.

SHA-256 anterior fallido: `15a17ed02478da22ffaff8213a69db8d40cb96c91d7b062ca97d07eacabf24b3`.
SHA-256 corregido: `c87ab99dca394fbb7c5f1595f9a1def825489fb3e9ba2b10174578c5c38279d3`.

## Revisión del resto del SQL

El resto afecta a objetos propios recién creados por postgres: CREATE TABLE/FUNCTION/INDEX, RLS, REVOKE/GRANT. No depende de propiedad sobre objetos de extensiones. Las FK necesitan REFERENCES sobre auth.users y public.teams; CREATE necesita permisos de esquema public/private; la programación requiere USAGE cron, EXECUTE cron.schedule(text,text) y CONNECT a la base. Se incluyen esas comprobaciones de lectura en el archivo de diagnóstico. Ninguna sentencia intenta cambiar tablas Auth/Storage, roles, políticas o propietarios administrados. No se modifican el registro manual, confirm_match_statistics_v3, puntos, OVR ni tarjetas.

## Pruebas repetidas

PostgreSQL 17.11 en Docker sin red/puertos. Se construyó el esquema previo y se configuró explícitamente:
- cron/extension propiedad de supabase_admin;
- postgres NOSUPERUSER y NOBYPASSRLS, sin pertenencia al rol administrador;
- postgres con SELECT sobre cron.job, sin INSERT/UPDATE/DELETE; objetos de app bajo postgres.

El bootstrap PostgreSQL no permite quitarse SUPERUSER: se usó un administrador local separado y un nuevo rol postgres restringido, transfiriendo únicamente objetos de app. No se degradaron permisos de cron ni se elevó al rol de migración para hacerlo pasar.

Resultados:
- LOCK antiguo reproduce permission denied for table job; la transacción fallida no deja tablas ni historial IA en el ensayo.
- Job legado con nombre colisionante: aborta y conserva el trabajo.
- Dos migraciones corregidas concurrentes: una completa, otra aborta; un registro propio y un único job SIN nombre.
- Escritor cron independiente concurrente: su job se conserva; todos los jobs anteriores permanecen iguales.
- No cambia el acceso de escritura de postgres sobre cron.job: sigue denegado tras la migración.
- Limpieza y ai_match_drafts.sql con el rol restringido: PASS, incluido flujo oficial manual/IA equivalente.
- 16 solicitudes de reserva concurrentes con el rol restringido: una reserva y cuota; replay, permisos, RLS, expiración, finalización inmutable/tardía y cuota UTC: PASS.
- Node tests/*.cjs: 99/99 PASS; Deno real con SDK y transporte simulado: 3/3 PASS; typecheck/lint exit 0; diff check PASS. Sin llamadas reales a OpenAI.

Tests nuevos/actualizados: supabase/tests/ai_match_hosted_permissions.py y ai_match_idempotency.py. El handler no ha cambiado. Evidencias en esta carpeta. Los 25 fallos SQL históricos independientes documentados en el ensayo anterior no se han modificado ni presentado como resueltos; esta revisión repitió el SQL IA relevante.

## Comprobación remota pendiente, solo lectura

El fallo comunicado ocurrió dentro de BEGIN, en el primer DO, antes de cualquier CREATE. Se espera que la transacción se aborte y no se registre la versión, pero NO se ha verificado el remoto ni se afirma que esté confirmado.

1. Usuario: ejecutar supabase migration list --linked. Esperado: 34 alineadas, 202610300001 solo Local.
2. Usuario: ejecutar en una nueva consulta SQL Editor como postgres el archivo ../07_ai_failed_push_readonly.sql y exportar JSON completo.
3. Esperado: ai_history_absent=true, ai_tables_absent=true, ai_functions_absent=true, ai_cleanup_jobs=[]; historial con las 34 versiones. USAGE/SELECT/EXECUTE/CONNECT/CREATE/REFERENCES necesarios=true; escritura directa en cron=false es NORMAL y ya no se requiere.
4. Si aparece un objeto, job o registro inesperado, detenerse y revisar; no borrar, reparar ni reintentar push automáticamente.
5. Tras revisar ese resultado y autorizar solo la simulación: supabase db push --linked --dry-run. Debe listar únicamente 202610300001_ai_match_drafts.sql. El SQL y hash han cambiado; una lista con el mismo nombre no verifica su ejecución.

No se ha ejecutado migration repair, push, secrets, functions deploy ni ninguna consulta remota. La prueba local modela las restricciones relevantes y no sustituye inspeccionar las condiciones reales con el archivo read-only antes de una nueva aplicación real.

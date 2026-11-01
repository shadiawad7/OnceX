# Ensayo local de los tres deltas — 2026-10-31

Resultado: `02_patch.sql` y `04_rollback.sql` originales pasan en PostgreSQL 17.11, imagen `supabase/postgres:17.11.0.003`. No se han editado los cuatro SQL aprobados ni su manifest. No se ha ejecutado ninguna operación contra Supabase remoto, migration repair, db push o despliegue.

## Entorno y reconstrucción

Contenedor exclusivo `oncex-rehearsal-20261031`, `--network none`, ningún puerto publicado, datos temporales en tmpfs. Cron con `cron.launch_active_jobs=off` para impedir ejecuciones automáticas, conservando las definiciones activas auditadas. El contenedor se eliminó al terminar; la imagen queda en caché.

Se reprodujeron las 31 migraciones anteriores reflejadas, excluyendo `202610100004`, `202610120001`, `202610220002` y la migración IA `202610300001`. Se restauraron las 64 definiciones de funciones y ACL exactas de la primera auditoría. Los roles/permisos, pesos, modelos, categorías, configuración de fotos y jobs coinciden con la segunda evidencia (ver `evidence_comparison.json`). Historial de migraciones vacío.

Auth y Storage son dependencias SQL mínimas del fixture: no se levantaron sus servicios HTTP. No se dispone de un backup de los registros personales ni de los históricos remotos; no se afirma haber clonado todos sus datos ni sus 132 assessments históricos. Las pruebas funcionales emplean usuarios y equipos sintéticos dentro de una transacción con ROLLBACK.

## Resultados

- Precheck: las ocho comprobaciones booleanas son verdaderas (`precheck.json`).
- Parche original: BEGIN/DO/DDL/COMMIT sin error (`patch.log`).
- Postcheck: las ocho comprobaciones booleanas son verdaderas (`postcheck.json`).
- Diff: exclusivamente una política nueva, dos funciones reemplazadas, dos funciones nuevas y un trigger nuevo, con los permisos correspondientes (`patch.diff`). No se modificó ninguna otra definición de función.
- Datos: todas las filas del fixture en public/private/auth/storage/supabase_migrations idénticas antes/después del parche. Configuración protegida idéntica. La comparación no cubre registros de producción no exportados.
- Pruebas funcionales: ámbito de creación de entrenadores/jugadores; dorsales ocupados/exclusión; rechazo de consultas a equipo ajeno; `save_match_lineup_v2` rechaza titulares sin portero y acepta 11 con portero; trigger rechaza confirmación sin portero; UPDATE de equipo por entrenador asignado permitido y de equipo ajeno bloqueado (`behavior.log`). No es una prueba integral de confirm_match_statistics_v3/IA/Auth HTTP ni de recálculo de puntos.
- Segunda aplicación del parche rechazada con código psql 3 por la guarda de precondiciones, sin cambios (`duplicate_patch.log`).
- Rollback original: ejecución sin error (`rollback.log`). Precheck posterior nuevamente verdadero (`rollback_precheck.json`).
- Esquema public/private tras rollback idéntico byte a byte al dump inicial, excluyendo únicamente los tokens aleatorios restrict/unrestrict de pg_dump. Todas las filas comparadas idénticas. Hashes en `comparison.json`.
- Las 64 funciones vuelven a coincidir exactamente en definición, propietario y ACL con la primera auditoría (`final_catalog_check.json`).
- Validador estático de artefactos: PASS. `npx tsc --noEmit`: sin errores. `npx expo lint`: sin errores ni advertencias de lint. Logs incluidos.

## Problemas encontrados y resueltos en el fixture

1. El entrypoint automático de la imagen esperaba el rol supabase_admin; se usó initdb/PostgreSQL directamente en el contenedor aislado.
2. El directorio inicial no era escribible por el usuario postgres; se usó /tmp/oncex-pg en tmpfs.
3. El ACL predeterminado por esquema del fixture no incluía postgres explícitamente; se corrigió para reproducir exactamente la auditoría antes del precheck satisfactorio.
4. La primera prueba funcional omitía user_roles de los jugadores y falló por FK; se corrigió el fixture y todas las pruebas funcionales posteriores pasaron.

No se encontró un error que requiriera cambiar el parche ni el rollback aprobados.

## Repetición local

Los scripts `build_local_fixture.py` y `run_local_rehearsal.py` usan exclusivamente el socket Docker local y el nombre de contenedor anterior. El constructor exige un contenedor sin red ni puertos, una base vacía con usuario postgres y la primera auditoría JSON como argumento; no contiene credenciales ni consulta Supabase remoto. El runner requiere el fixture ya construido y deja las evidencias en esta carpeta. No deben ejecutarse contra una base que no sea desechable.

El ensayo acredita los deltas sobre el esquema/configuración reproducidos. No autoriza producción ni reconcilia su historial. Antes de cualquier aplicación remota siguen siendo necesarios aprobación explícita, backup y un precheck reciente satisfactorio. No se ha ejecutado dry-run remoto ni se ha confirmado aún que proponga únicamente la migración IA.

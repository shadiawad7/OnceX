# Propuesta final de reconciliación de ONCEX — 31 de octubre de 2026

**Estado: propuesta; no ejecutada.** No se ha enviado SQL a producción, reparado historial, aplicado migraciones, desplegado funciones ni cambiado código de la app.

## Evidencias y alcance

1. Auditoría de catálogos aportada por el usuario: `2026-10-30T19:06:10.974327+00:00`.
2. `supabase/audits/oncex_reconciliation_evidence.txt`: `2026-10-31T15:39:53.174347+00:00`.
3. Los 34 SQL locales anteriores a `202610300001_ai_match_drafts.sql`.

Se comparó el **estado final material** considerando sustituciones posteriores, no se afirma que cada sentencia histórica se ejecutara. Son dos instantáneas distintas: antes de cualquier escritura deberán actualizarse las precondiciones del catálogo y del historial.

## Resultado final de esta comparación

**31 reflejadas; 3 ausentes; 0 parciales; 0 pendientes de evidencia para la equivalencia final analizada.**

Esto no equivale a autorizar 34 marcas de applied: tres efectos siguen ausentes y la ejecución histórica de sentencias puntuales no puede reconstruirse a partir del estado actual. Tampoco reemplaza una restauración de prueba de PostgreSQL, aún pendiente por Docker.

Se verificaron mediante comparación local de los JSON y las constantes de los SQL:

- 5 roles, 14 permisos y 39 asignaciones rol-permiso, sin diferencias.
- Las 4 filas de pesos oncex-match-v2, en todas sus posiciones y campos.
- Modelos oncex-card-v1/v2/v3: JSON specification completo, approved y umbrales exactos. Los tres están aprobados y tienen mínimos 1/1/1 en el estado final.
- Las 14 correspondencias de categorías.
- Los dos buckets privados, límite 5 MiB y los tres MIME previstos.
- Fila singleton de ajustes de foto.
- 2 jobs activos, sus horarios, comandos, usuario postgres y base postgres. El job antiguo oncex-team-plan-renewals no existe.
- Conteos de backfill sin faltantes. No se exportaron nombres, emails ni IDs de jugadores para esta comprobación.
- Historial conservado: 22 assessments v1, 11 v2 y 99 v3. El resumen mensual vacío no prueba una migración ausente: la tabla y el job existen; no se crearán snapshots para forzar evidencia.

La auditoría anterior ya había comparado las tablas, columnas, funciones, triggers, políticas y ACL, detectando las tres diferencias de abajo.

## Clasificación de las 34 migraciones

| Migración | Clasificación final | Evidencia / interpretación |
|---|---|---|
| `202610100001_users_roles.sql` | Reflejada | Esquema y helpers; 5 roles y 14 permisos finales, matriz final de 39 asignaciones; sin usuarios Auth sin perfil ni perfiles sin rol. |
| `202610100002_super_admin.sql` | Reflejada | Actividad, planes y políticas; permisos profiles.manage/plans.manage/activity.read y sus asignaciones presentes. |
| `202610100003_hierarchy_accounts.sql` | Reflejada | Jerarquía y catálogo de team_admin/accounts.create presentes. La ampliación posterior no reflejada se atribuye a 202610120001. |
| `202610100004_coach_manages_team.sql` | Ausente | Falta teams_update_assigned_coach. Ausente el efecto específico del archivo. |
| `202610100005_player_position.sql` | Reflejada | position y permisos/políticas de edición presentes. |
| `202610100006_player_details.sql` | Reflejada | Campos deportivos, CHECK, permisos y can_edit_player presentes. |
| `202610100007_player_rankings.sql` | Reflejada | Ranking y score presentes con las sustituciones posteriores esperadas; no se restaura la edición manual ni el límite antiguo. |
| `202610110001_disable_manual_score.sql` | Reflejada | EXECUTE de set_player_score revocado para authenticated/anon/PUBLIC. |
| `202610110002_profile_photos.sql` | Reflejada | Helpers y políticas presentes; profile-photos privado, 5 MiB, JPEG/PNG/WebP exactos. |
| `202610110003_player_registration.sql` | Reflejada | Dorsal y restricciones de edición del perfil/foto del jugador presentes. |
| `202610120001_coach_account_creation.sql` | Ausente | can_provision conserva el cuerpo anterior: el coach no recibe la ampliación para crear coaches. |
| `202610120002_club_photos.sql` | Reflejada | Helpers y políticas presentes; club-photos privado, 5 MiB, JPEG/PNG/WebP exactos. |
| `202610120003_team_plans.sql` | Reflejada | plan_code y trigger presentes, en la definición posterior esperada. |
| `202610140001_team_plan_access.sql` | Reflejada | Estado final sustituido correctamente por 202610210001; viewer_club_plan/rankings coinciden. |
| `202610140002_coach_names.sql` | Reflejada | RPC de autorización y edición de nombre de coach presentes. |
| `202610170001_admin_hierarchy_delete.sql` | Reflejada | admin_delete_hierarchy coincide con la definición esperada. |
| `202610180001_coach_team_plans.sql` | Reflejada | Estado intermedio sustituido por 202610180002, como corresponde al estado final. |
| `202610180002_scheduled_team_plans.sql` | Reflejada | Periodos y RPC presentes; retirada posterior de writers antiguos respetada. |
| `202610180003_team_plan_cron.sql` | Reflejada | Estado final por supersesión: pg_cron presente y job de renovaciones eliminado por 202610210001. No reprogramarlo. |
| `202610200001_match_lineups.sql` | Reflejada | Partidos, actuaciones y estadísticas base presentes con evoluciones posteriores esperadas. |
| `202610210001_oncex_single_plan.sql` | Reflejada | Licencias/identidades y RPC presentes; 0 jugadores actuales sin identidad; job antiguo ausente y writers retirados. |
| `202610210002_match_scoring_v2.sql` | Reflejada | Funciones/tablas y las cuatro filas oncex-match-v2 coinciden íntegramente. |
| `202610210003_ovr_monthly_history.sql` | Reflejada | Historial OVR e inmutabilidad presentes; job mensual activo con horario/comando/usuario/base esperados. |
| `202610220001_unique_team_jerseys.sql` | Reflejada | Helper, validadores y triggers de unicidad de dorsales presentes. |
| `202610220002_live_jerseys_goalkeeper.sql` | Ausente | Faltan team_jersey_numbers, require_starting_goalkeeper, match_requires_goalkeeper y el guard de portero en save_match_lineup. |
| `202610230001_match_result_consistency.sql` | Reflejada | Confirmación v2 coincide con las reglas de coherencia; revocaciones posteriores esperadas presentes. |
| `202610230002_away_win_bonus.sql` | Reflejada | venue, alineación v2 y confirmación v3 coinciden, con sus permisos vigentes. |
| `202610230003_card_calculation.sql` | Reflejada | Infraestructura Card, modelo v1, 14 categorías y job diario verificados; versiones intermedias sustituidas después. |
| `202610230004_card_first_appearance.sql` | Reflejada | Modelo v1 con minimum_matches=1 y minimum_minutes=1. |
| `202610230005_card_any_cohort.sql` | Reflejada | CHECK de cohorte >=1 y modelo v1 con minimum_cohort=1. |
| `202610230006_card_singleton_reference.sql` | Reflejada | Reflejada por supersesión final: el boost singleton fue retirado por v2/v3. No se debe restaurar ni regenerar históricos para demostrar su ejecución pasada. |
| `202610230007_card_official_points_v2.sql` | Reflejada | Modelo v2 completo y specification exacta; código posterior v3 y conservación de historial correctos. |
| `202610230008_card_accumulated_impact.sql` | Reflejada | Modelo v3 completo y specification exacta; cuerpos vigentes y umbrales coinciden. |
| `202610250001_photo_background_removal_setting.sql` | Reflejada | Tabla, políticas, permisos y fila singleton presentes; background_removal_enabled=true en la exportación. |

## Propuesta recomendada: conservar la cadena original y completar solo los tres deltas ausentes

No se reejecutan los 34 archivos antiguos. No se cambian fórmulas, pesos, modelos, rankings, licencias, cron vigente ni registros de partidos/jugadores. No se llama a refresh_all_cards, close_ovr_month ni funciones de backfill.

### 1. Respaldo y precondiciones, antes de cualquier escritura

- Guardar y comprobar un respaldo de datos restaurable, exportación de esquema/grants y copia exacta del historial de migraciones. Un dump de esquema solo no es un backup de datos.
- Confirmar el proyecto remoto y repetir lectura de historial y de los objetos que va a tocar el parche. Si difieren de las definiciones auditadas o alguno de los objetos faltantes ya existe, abortar y revisar; no usar IF NOT EXISTS para ocultar diferencias.
- Fijar los 34 archivos originales y sus hashes como manifiesto de reconciliación, incluyendo el SQL revisado del parche.

### 2. Preparar un parche de reconciliación revisable, fuera de supabase/migrations

El parche reflejaría exclusivamente los efectos ausentes de las tres versiones existentes; no introduciría una migración posterior adicional que altere el objetivo del dry-run. Se conservaría como evidencia y se ensayaría antes de usarlo. Su contenido exacto previsto:

| Versión | DDL propuesto | Cambio efectivo que exige aprobación |
|---|---|---|
| 202610100004 | Crear solo teams_update_assigned_coach con USING/WITH CHECK del SQL original. | Permite al entrenador actualizar su equipo conforme a esa política. |
| 202610120001 | Sustituir solo private.can_provision por el cuerpo de esa versión; conservar firma y restricciones de EXECUTE. | Amplía la autorización del coach: puede crear coaches además de players dentro de sus equipos. |
| 202610220002 | Crear team_jersey_numbers con sus grants/revokes; sustituir save_match_lineup por el cuerpo con comprobación de portero; crear require_starting_goalkeeper y match_requires_goalkeeper con sus revocaciones. | Añade la consulta de dorsales y exige portero en nuevas alineaciones/confirmaciones y futuras correcciones alcanzadas por el trigger. |

Las dos sustituciones son necesarias porque existe una **versión anterior**, no porque haya que repetir un cambio ya aplicado. No se alteran sus firmas ni las reglas de puntuación. El nuevo trigger no se ejecuta retroactivamente sobre partidos ya guardados, pero sí condicionará futuras actualizaciones de actas confirmadas.

### 3. Ensayo y revisión del parche

- Probarlo en una copia desechable fiel al remoto cuando exista Docker, o en un entorno de pruebas expresamente autorizado. No crear ahora recursos remotos ni usar producción para ensayar.
- Verificar las tres autorizaciones/validaciones, confirmar que la comparación del esquema solo contiene esos deltas y que no hay DML sobre datos de aplicación.
- Comparar valores/configuración y conteos antes/después; ensayar la reversión de DDL y el comportamiento de partidos existentes sin escribir en producción.
- Presentar SQL, precondiciones, resultados y reversión para autorización explícita. Esta propuesta no es todavía esa autorización.

### 4. Solo con autorización, aplicar los deltas y volver a auditar

Aplicar el parche de DDL en una transacción con límites de espera. Si una comprobación falla, rollback completo. Repetir auditoría; las 34 versiones deberán quedar materialmente reflejadas. Verificar que pesos/modelos/configuración/datos actuales no han cambiado.

### 5. Solo entonces, reconciliar el historial sin ejecutar los SQL antiguos

Registrar mediante la herramienta de reparación exclusivamente las versiones del manifiesto validado:

- Las 31 cuyo estado final ya es equivalente.
- Las otras 3 solo después de aplicar y comprobar sus efectos faltantes.

No introducir 202610300001 como aplicada. La reparación solo modifica metadatos de historial; no completa funciones/políticas ausentes. Por eso se hace después de verificar los deltas y no para ocultarlos. No se proporciona ni ejecuta ahora un comando masivo.

### 6. Comprobación final y despliegue de IA separado

Leer nuevamente el historial y simular el siguiente despliegue. El único resultado aceptable es `202610300001_ai_match_drafts.sql`. Si aparecen más versiones, detenerse. Solo tras revisar ese resultado se propondría aplicar IA y desplegar su Edge Function en un paso aparte. No se da ahora una orden de db push.

## Si no se aprueban cambios de permisos/validación existentes

No se deben marcar las tres ausentes como aplicadas. La alternativa sería una línea base verificada que refleje exactamente el remoto actual y archivar el historial anterior fuera del directorio activo. Eso preservaría las tres diferencias y cambiaría la organización del historial local; exige una propuesta y decisión separadas. No se ha creado esa línea base ni movido ningún SQL.

## Trabajo realizado y pendiente

Realizado: comparación offline de ambas evidencias, clasificación y propuesta. Ningún cambio remoto.
Pendiente: evidencia actualizada inmediatamente anterior a una escritura, respaldo/restauración de prueba, SQL del parche revisado, ensayo Postgres y autorización. No se ha verificado todavía un dry-run que proponga solo IA.

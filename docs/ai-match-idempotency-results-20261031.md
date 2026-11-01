# Idempotencia AI Match Drafts — resultados 2026-10-31

Revisión SQL posterior: ver `docs/ai-match-migration-final-review-20261031.md`. Ese informe contiene el hash vigente y endurecimientos adicionales de cuota/cron/caducidad. Los resultados y hashes de abajo corresponden al ensayo anterior.

Implementada localmente; producción, historial remoto, secrets y despliegues sin tocar. No se modificaron fórmulas, RPC oficiales de alineación/confirmación ni pruebas antiguas.

## Semántica y seguridad

La Edge Function calcula SHA-256 sobre versión del contrato, tipo de entrada y contenido exacto. En audio usa bytes y MIME, no nombre de archivo ni límites multipart. La clave de la reserva es usuario autenticado + equipo + hash; no se acepta una clave elegida por el móvil. No es deduplicación semántica de relatos distintos ni de audios recodificados.

`ai_match_request_start` verifica los permisos actuales, intenta INSERT ON CONFLICT y solo el ganador llama a ai_match_context, incrementa cuota y obtiene plantilla. Los duplicados reciben 409 mientras está en curso. Tras finalizar se devuelve exactamente el resultado guardado; los borradores se revalidan contra la plantilla actual. Revocar acceso al equipo también impide recuperar la caché. El contador/RPC originales permanecen sin cambios.

Solo service_role/propietario pueden finalizar mediante ai_match_request_finish. La función usa SUPABASE_SERVICE_ROLE_KEY suministrada por el entorno exclusivamente para ese RPC; lectura de permisos/plantilla y reserva mantienen JWT del usuario. Authenticated/anon no pueden publicar resultados ni acceder directamente a la tabla. Una finalización no puede sobrescribir otra.

Una llamada con fallo también queda registrada para evitar repetir consumo incierto. Si la función cae o el resultado no puede guardarse, no hay takeover, desbloqueo por timeout ni reintento de proveedor. El usuario puede consultar enviando exactamente lo mismo o continuar manualmente. Se sacrifica recuperación automática ante crash para evitar dobles consumos: no se promete exactly-once del proveedor externo ante cualquier fallo de infraestructura.

Los resultados son caché privada de borradores/transcripción, nunca estadísticas oficiales. Se devuelven durante 24 horas. Un job horario limpia el contenido vencido (borrado físico hasta aproximadamente 25 h) y elimina reservas tras 48 horas (hasta aproximadamente 49 h); tras eliminarse una reserva el mismo contenido puede ser una operación nueva. Las reservas expiradas que aún existen no se reactivan. Esto es una ventana acotada, no deduplicación perpetua. No se guardan el audio ni el relato escrito original; una transcripción sí forma parte del resultado temporal. Las copias de seguridad del proveedor tienen su propia retención.

## Migración cambiada

Se modifica la migración todavía pendiente 202610300001_ai_match_drafts.sql. Mantiene intactos contador y ai_match_context, y añade tabla privada/RLS, RPC de reserva, RPC de finalización, helper de limpieza y job cron. Ninguna migración reconciliada se ha tocado ni se añade una versión 36.

- SHA-256 antes: `725543ebefe166a8f134f8f3aafb9a1a6cf78f8c24373474c77123bc51a98023`.
- SHA-256 después: `efe151e97d33e7313a019edd9575c3d6adb2cb343a5d10e40d0d207206156f5c`.

El dry-run aprobado correspondía al SQL anterior; debe revisarse este SQL completo y repetir migration list/dry-run únicamente tras autorización. El nombre pendiente sigue siendo el mismo, pero eso no valida su nuevo contenido.

## Pruebas

- Node: 99/99 PASS (28 específicas IA, incluidas seis nuevas de deduplicación). Transporte simulado; 0 llamadas reales a OpenAI.
- PostgreSQL 17.11 local: 35 migraciones aplicadas correctamente. ai_match_drafts.sql PASS, incluido resultado oficial idéntico entre actas manual/IA mediante los mismos RPC.
- ai_match_idempotency.py: 16 sesiones simultáneas, una reserva, 15 pending, un incremento de cuota. Replay sin incremento, fin inmutable, permisos/RLS, revocación de acceso, expiración/limpieza, fallo cacheado y no takeover: PASS.
- Deno 2.2.12 real: deno check del handler PASS; 3 pruebas del handler y SDK Supabase reales con transporte simulado PASS. Incluyen 20 duplicados concurrentes y un solo procesamiento, recuperación, audio, usuarios/contenidos distintos y errores cacheados. El test no tiene permiso de red; no llama al proveedor.
- Supabase Edge Runtime v1.67.4: bundle eszip del código final PASS. Arranque del eszip usando la ruta de entrada incluida en el bundle y ejecución local sin red: OPTIONS=200, POST sin sesión=401, GET=405. Esto prueba empaquetado/arranque real, no un Supabase Auth/PostgREST completo con OpenAI real.
- npx tsc --noEmit y npx expo lint: PASS. tsconfig separa supabase/tests (Deno) del proyecto Expo; sus tipos se comprueban mediante Deno, sin silenciar errores de la app.
- git diff --check sobre los archivos modificados: PASS.

Logs y manifiesto en supabase/reconciliation/20261031_three_deltas/ai_idempotency_results/.

## Suite SQL histórica: no está verde

Se ejecutaron los 30 archivos SQL sin modificarlos: 5 PASS y 25 FAIL. NO es únicamente admin_hierarchy_delete.sql. Se reconstruyó una segunda base idéntica sin la migración IA y se repitieron las 29 pruebas anteriores: los mismos 25 fallos, mismos códigos de salida y primer mensaje de error. Por tanto son independientes de AI Match Drafts en este entorno de esquema final y dependencias Auth/Storage SQL mínimas. No se afirma haber demostrado que fallen en una instalación íntegra de Supabase de producción ni que todos sean bugs de aplicación: varias pruebas históricas esperan estados de migraciones intermedias.

| Prueba | Primer error, también sin IA |
|---|---|
| `admin_hierarchy_delete.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `card_accumulated_impact.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `card_any_cohort.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `card_calculation.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `card_first_appearance.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `card_official_points_v2.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `card_singleton_reference.sql` | ERROR:  null value in column "recovery_email" of relation "player_identities" violates not-null constraint |
| `club_photos.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `coach_account_creation.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `coach_names.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `coach_team_plans.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `hierarchy_accounts.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `live_jerseys_goalkeeper.sql` | ERROR:  No puedes consultar los dorsales de este equipo. |
| `match_lineups.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `match_result_consistency.sql` | ERROR:  permission denied for function save_match_lineup |
| `match_scoring_v2.sql` | ERROR:  permission denied for function save_match_lineup |
| `ovr_monthly_history.sql` | ERROR:  Missing model fabricated a rating/history |
| `player_rankings.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `player_registration.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `profile_photos.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `scheduled_team_plans.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `super_admin.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `team_plan_access.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `team_plans.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |
| `users_roles.sql` | ERROR:  La cuenta necesita un email para conservar su identidad. |

No se ha alterado ningún fixture antiguo, política de negocio ni fórmula para cambiar esos resultados.

## Archivos de esta tarea

Modificados: docs/ai-match-entry.md; supabase/functions/ai-match-draft/index.ts; supabase/migrations/202610300001_ai_match_drafts.sql; tests/aiMatchDraft.cjs; tsconfig.json.
Añadidos: supabase/tests/ai_match_idempotency.py; supabase/tests/ai_match_runtime_test.ts; este informe y evidencias locales. Los cambios anteriores de diseño del workspace se conservan sin tocar ni incluir en un commit. No se ha creado commit.

## Pendientes antes de producción

Revisar/aprobar la migración ampliada y su almacenamiento temporal; repetir el dry-run autorizado. Probar con Auth/PostgREST completos, un dispositivo y OpenAI reales antes de apertura general; estas pruebas no se presentan como superadas. Resolver/planificar los fallos históricos por separado si se exige suite global verde. No quedan bloqueos de Docker, Deno ni empaquetado en este ensayo. Se mantienen los tres secrets OPENAI_* del plan previo; la variable interna SUPABASE_SERVICE_ROLE_KEY se necesita ahora también, solo en servidor, sin exponerla ni configurarla en Expo.

Para repetir Deno: `deno check supabase/functions/ai-match-draft/index.ts` y `deno test --allow-env supabase/tests/ai_match_runtime_test.ts`. Para PostgreSQL concurrente usar el script nuevo solo sobre un contenedor desechable sin red/puertos y con todas las migraciones; inserta fixtures sintéticos de prueba que se destruyen al eliminar el contenedor.

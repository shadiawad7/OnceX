# Revisión final de migración IA — 2026-10-31

**DICTAMEN SUSTITUIDO:** el LOCK de esta versión falló en Supabase alojado. Consultar `docs/ai-match-hosted-cron-fix-20261031.md` para el SQL corregido y las pruebas con rol restringido. Este documento conserva la evidencia histórica del ensayo anterior.

**LISTO PARA DRY-RUN DE PRODUCCIÓN.** No equivale a autorizar push/despliegue. Revisión local sobre el esquema final reconstruido según las migraciones reconciliadas; ninguna operación remota, secrets o despliegue ejecutados.

SQL revisado: `supabase/migrations/202610300001_ai_match_drafts.sql`.
SHA-256: `15a17ed02478da22ffaff8213a69db8d40cb96c91d7b062ca97d07eacabf24b3`.
SHA previo a esta revisión: `efe151e97d33e7313a019edd9575c3d6adb2cb343a5d10e40d0d207206156f5c`.

## Correcciones de esta revisión

1. Rol postgres obligatorio, lock_timeout 5 s y statement_timeout 30 s. Un error cancela la transacción sin dejar una aplicación parcial.
2. Se rechaza un job con nombre oncex-ai-draft-cleanup antes de programarlo. LOCK TABLE cron.job IN SHARE ROW EXCLUSIVE MODE serializa también escritores concurrentes: cron.schedule no puede hacer upsert sobre un job aparecido entre la lectura y la programación. El bloqueo es breve y no cambia los jobs existentes; si no se obtiene o no hay permisos, se aborta. Se necesitan los permisos PostgreSQL correspondientes antes de la aplicación real.
3. Finalizar una reserva exige que no hayan pasado 24 horas. Una respuesta tardía no puede reintroducir contenido ya caducado/limpiado. El UPDATE condicional sigue impidiendo sobrescrituras y finalizaciones duplicadas.
4. La cuota usa horas UTC independientes de timezone de sesión. Preferencias de zona horaria no generan ventanas adicionales de cuota.
5. Se tolera la eliminación concurrente de una reserva después del conflicto de INSERT: devuelve expired, nunca crea un nuevo procesamiento ni lanza NO_DATA_FOUND.
6. Conflictos de reserva acotados a su PK; otros conflictos no se ocultan. Índice created_at para limpieza y revocación explícita de acceso directo a ambas tablas también a service_role. La finalización desde backend sigue funcionando mediante SECURITY DEFINER.

## Alcance y seguridad verificados

- Solo CREATE de dos tablas privadas, cuatro funciones nuevas, un índice, permisos y un job nuevo. No hay CREATE OR REPLACE, DROP ni ALTER sobre tablas/funciones oficiales existentes. ALTER TABLE/RLS y revocaciones afectan exclusivamente a los dos objetos nuevos. Las FK a auth.users/teams solo limpian sus registros auxiliares al borrar usuario/equipo.
- Nuevas tablas con RLS habilitada y sin políticas de cliente; sin acceso directo de PUBLIC, anon, authenticated o service_role. Propietario postgres. Bypass del propietario es intencionado para RPC SECURITY DEFINER.
- Todas las funciones SECURITY DEFINER con search_path vacío y referencias calificadas a tablas/helpers. Los builtins se resuelven en pg_catalog. No hay SQL dinámico ni concatenación de entrada en SQL.
- Contexto y reserva requieren auth.uid y can_manage_match_team. Cliente solo obtiene plantilla mínima y su propia reserva/resultado, con autorización actual sobre el equipo, sin acceso a las de otros usuarios. El hash elegido en una llamada directa al RPC no permite publicar resultados ni acceder a otro usuario: la clave incorpora auth.uid y equipo autorizado. El endpoint calcula el hash por sí mismo.
- ai_match_request_finish es un RPC público por ubicación en el esquema, pero EXECUTE está revocado a PUBLIC/anon/authenticated y permitido solo a service_role y propietario. Conocer lease_id no concede permiso al móvil. cleanup_ai_match_requests permanece privado y ejecutable solo por propietario.
- PK e INSERT ON CONFLICT garantizan un solo ganador; solo ese ganador consume cuota y obtiene contexto. Replays/processing/expired no incrementan cuota. El incremento de presupuesto es atómico y su fallo revierte también la reserva.
- Resultados recuperables 24 h; no se recuperan al expirar aunque el cron todavía no los haya purgado físicamente. Job horario a minuto 17 limpia cuerpos >24 h y reservas >48 h, exclusivamente en la tabla auxiliar. No ejecuta recálculos ni modifica cron de tarjetas/OVR. Borrado físico depende de que el job se ejecute; monitorizarlo. No hay recuperación automática de reservas abandonadas. Tras eliminar una reserva expirada, un envío igual puede ser una operación nueva; no se promete deduplicación perpetua.
- Respuestas temporales limitadas a 1 MiB, incluidos borrador y transcripción; no se almacena audio. Resultado oficial sigue pasando únicamente por save_match_lineup_v2/confirm_match_statistics_v3. Ninguna fórmula, estadística, puntos, OVR, amarillas/rojas o tarjeta del jugador se modifica por esta migración.
- Es una migración de aplicación única. CREATE falla si un objeto ya existe; la guarda de cron evita sustituirlo. No se usan IF NOT EXISTS para ocultar divergencias. Una segunda aplicación se rechaza sin cambios. El historial CLI, una vez aplicada, evita repetirla normalmente.

## Pruebas de la versión SQL final

PostgreSQL 17.11 local, contenedor sin red ni puertos, sin credenciales de producción y cron automático deshabilitado:

- Aplicación sobre el esquema anterior a IA: PASS.
- Colisión con job preexistente: aborta y conserva command del job y funciones anteriores, sin tablas IA parciales: PASS.
- Propietario inesperado: aborta: PASS.
- Segunda aplicación: aborta y conserva funciones: PASS.
- ai_match_drafts.sql: PASS, incluyendo autorización, minimización, límite y equivalencia de actas oficiales manual/IA.
- 16 sesiones concurrentes: 1 reserva/cuota, 15 pendientes; replay, RLS/permisos, revocación de acceso, fin inmutable, caducidad y limpieza: PASS.
- Finalización >24 h: rechazada. Zonas UTC/Asia-Kathmandu: una misma ventana. Service-role sin SELECT directo: PASS.
- Escritor de cron concurrente: la migración espera y luego rechaza el job aparecido, conservándolo: PASS.
- Node específicas IA: 28/28 PASS, sin llamadas reales a OpenAI.
- Typecheck de app y lint: exit 0. git diff --check: PASS.

No se cambió el handler en esta revisión SQL: el empaquetado/Deno previamente verificados siguen correspondiendo al mismo código de función. Los 25 fallos históricos de la suite SQL, reproducidos sin IA en el ensayo anterior, no se han silenciado ni arreglado artificialmente; esta revisión no afirma suite global verde.

Evidencias: supabase/reconciliation/20261031_three_deltas/ai_migration_final_review/.

## Siguiente paso y límites

Procede revisar el dry-run de producción solo cuando se autorice. El único nombre pendiente debe seguir siendo 202610300001_ai_match_drafts.sql; ahora su contenido/hash es el de este informe. El dry-run solo enumera migraciones: no demuestra la ejecución del SQL ni los permisos efectivos del remoto. Antes del push real habrá que confirmar proyecto/estado actual, ausencia de objetos IA y del job, prerrequisitos y permisos de cron. La migración aborta sin sustituir objetos si detecta colisiones.

No se ha comprobado de nuevo el remoto por instrucción del usuario. Siguen pendientes los smoke tests completos de Auth/PostgREST/OpenAI/dispositivo y aprobación explícita para cualquier aplicación real. No son bloqueos para un dry-run de solo lectura.

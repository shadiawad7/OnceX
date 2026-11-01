# Reconciliación del historial remoto de ONCEX

Fuente: `oncex_readonly_audit` aportado por el usuario; instantánea `2026-10-30T19:06:10.974327+00:00`.
Referencia: estado final de los 34 archivos locales anteriores a `202610300001_ai_match_drafts.sql`.
No se ejecutaron comandos ni consultas contra producción para este análisis. No se reparó historial, no se modificaron migraciones, fórmulas, permisos remotos ni registros.

## Resultado

El historial remoto existe y está vacío: `history_versions` contiene una tabla XML sin filas. Esto no coincide con el extenso esquema ya desplegado.
Hay diferencias reales: no procede marcar masivamente las 34 migraciones como aplicadas.

Clasificación: **16 pendiente de evidencia, 3 ausente, 15 reflejada**. No se ha confirmado una migración parcialmente reflejada: los efectos concretos de las tres señaladas como ausentes no están presentes; el resto de incertidumbres se etiqueta como evidencia pendiente, no como ausencia.

## Alcance y límites de la comparación

- Los 24 nombres de tablas de aplicación coinciden con los esperados; además existe la secuencia de actividad.
- Se comprobaron 161 columnas por nombre, tipo y nulabilidad, sin diferencias. Se revisaron restricciones y privilegios de los objetos afectados; no se ejecutó un diff de restauraciones PostgreSQL en una base desechable.
- Se extrajo de cada migración la última definición de cada función, respetando sustituciones posteriores. De 66 funciones esperadas: 62 tienen el mismo cuerpo SQL tras eliminar comentarios y diferencias de formato, dos tienen cuerpos anteriores y dos faltan. No se detectaron diferencias de lenguaje, volatilidad o SECURITY DEFINER/INVOKER entre las funciones presentes; el prefijo public omitido por el deparser en team_match_list es una diferencia de representación.
- De 36 políticas esperadas falta una. Los ocho índices explícitamente creados están presentes. De 19 triggers de aplicación esperados falta uno; los triggers adicionales de Storage son propios de Supabase.
- La igualdad del código de cálculo no acredita la igualdad de las filas que parametrizan ese cálculo. El inventario no exportó roles/permisos de negocio, buckets, pesos, modelos OVR, mapping, ajustes singleton ni cron.job.
- «Reflejada» significa efecto persistente material compatible con el estado final esperado, no certificado de que cada sentencia histórica se ejecutó. No se exige restaurar versiones intermedias sustituidas.
- Las ejecuciones puntuales de refresh/backfills no pueden fecharse ni probarse históricamente solo con catálogos. Las consultas siguientes aportan estado actual; no autorizan recalcular ni recrear históricos.

## Clasificación completa

| Migración | Estado | Evidencia / límite |
|---|---|---|
| `202610100001_users_roles.sql` | Pendiente de evidencia | Tablas, RLS y helpers presentes. Falta verificar roles/permisos iniciales y el resultado material del backfill, sin exportar usuarios. |
| `202610100002_super_admin.sql` | Pendiente de evidencia | Planes, suscripciones, actividad, triggers y RPC presentes. Faltan las filas de permisos y sus asignaciones. |
| `202610100003_hierarchy_accounts.sql` | Pendiente de evidencia | Jerarquía, FK de coach, políticas y funciones presentes. Faltan las filas de team_admin/accounts.create y sus permisos. La desviación posterior de can_provision se atribuye a 202610120001. |
| `202610100004_coach_manages_team.sql` | Ausente | No existe public.teams.teams_update_assigned_coach. Es el único efecto de este archivo; no aparece una política sustitutiva de actualización para el entrenador. |
| `202610100005_player_position.sql` | Reflejada | position, permiso de columna y políticas de edición por club/coach presentes. |
| `202610100006_player_details.sql` | Reflejada | birth_date/sporting_role/preferred_foot, restricciones, permisos y can_edit_player presentes. |
| `202610100007_player_rankings.sql` | Reflejada | oncex_score y RPC de rankings presentes con la evolución posterior esperada: numeric(12,2), sin límite 0–100 y sin escritura manual autenticada. |
| `202610110001_disable_manual_score.sql` | Reflejada | set_player_score no concede EXECUTE a authenticated, anon ni PUBLIC. |
| `202610110002_profile_photos.sql` | Pendiente de evidencia | photo_path, helpers, RPC y políticas de Storage presentes. Falta la configuración real de profile-photos en storage.buckets. |
| `202610110003_player_registration.sql` | Reflejada | jersey_number y restricciones, UPDATE de columna y restricciones de perfil/foto del jugador presentes. |
| `202610120001_coach_account_creation.sql` | Ausente | can_provision conserva el cuerpo anterior: el coach solo puede crear jugadores, no entrenadores. No coincide con la sustitución de este archivo. |
| `202610120002_club_photos.sql` | Pendiente de evidencia | Foto del club, attach_club_photo y políticas presentes. Falta la configuración real de club-photos. |
| `202610120003_team_plans.sql` | Reflejada | plan_code, CHECK y trigger presentes; el cuerpo vigente del trigger es el posterior esperado de 202610180002. |
| `202610140001_team_plan_access.sql` | Reflejada | viewer_club_plan y rankings están en su versión final de 202610210001. El antiguo filtro basic/pro fue sustituido deliberadamente por esa migración posterior. |
| `202610140002_coach_names.sql` | Reflejada | can_edit_coach_name y rename_coach coinciden; EXECUTE autenticado presente. |
| `202610170001_admin_hierarchy_delete.sql` | Reflejada | admin_delete_hierarchy coincide en cuerpo y atributos; permisos restringidos presentes. |
| `202610180001_coach_team_plans.sql` | Reflejada | check_team_plan está en el estado posterior esperado de 202610180002. No debe restaurarse aquí el cuerpo intermedio anterior. |
| `202610180002_scheduled_team_plans.sql` | Reflejada | Columnas de periodo, CHECK, funciones y permisos coinciden con su estado final. get_team_plan/schedule_team_plan están revocadas y apply_due_team_plans es no-op por 202610210001. |
| `202610180003_team_plan_cron.sql` | Pendiente de evidencia | pg_cron existe. El job de renovaciones antiguo debe estar eliminado por 202610210001; el inventario no incluye cron.job. No volver a programarlo. |
| `202610200001_match_lineups.sql` | Reflejada | Partidos/actuaciones, restricciones, permisos, resúmenes y estadísticas base presentes. Se respetaron las sustituciones posteriores de puntos/confirmación. La falta del portero se atribuye a 202610220002. |
| `202610210001_oncex_single_plan.sql` | Pendiente de evidencia | Tablas de identidades/licencias y RPC coinciden. Faltan pruebas del backfill de identidades y de la retirada del job antiguo. No se deben reactivar/cancelar licencias para auditar. |
| `202610210002_match_scoring_v2.sql` | Pendiente de evidencia | Revisiones, temporada, scoring_version, breakdown, concedidos y funciones coinciden. No se exportaron las cuatro filas de pesos oncex-match-v2. |
| `202610210003_ovr_monthly_history.sql` | Pendiente de evidencia | Tablas e historial OVR, validadores e inmutabilidad presentes. Falta configuración del cierre mensual en cron.job. |
| `202610220001_unique_team_jerseys.sql` | Reflejada | team_jersey_available, los dos validadores y triggers de unicidad coinciden. |
| `202610220002_live_jerseys_goalkeeper.sql` | Ausente | No están team_jersey_numbers, require_starting_goalkeeper ni match_requires_goalkeeper. save_match_lineup conserva el cuerpo anterior sin comprobar un portero titular. |
| `202610230001_match_result_consistency.sql` | Reflejada | confirm_match_statistics_v2 coincide con la coherencia de goles/asistencias/propias y queda revocada para authenticated por la evolución a v3. |
| `202610230002_away_win_bonus.sql` | Reflejada | venue y CHECK, save_match_lineup_v2 y confirm_match_statistics_v3 coinciden. EXECUTE autenticado solo en las versiones vigentes esperadas. |
| `202610230003_card_calculation.sql` | Pendiente de evidencia | Funciones/trigger Card presentes con las versiones finales esperadas. Faltan modelo v1, mapping de categorías y job diario. No ejecutar refresh_all_cards como comprobación. |
| `202610230004_card_first_appearance.sql` | Pendiente de evidencia | Solo actualiza umbrales del modelo v1 y recalcula. El inventario no contiene filas de ovr_models ni evidencia del estado de esos umbrales. |
| `202610230005_card_any_cohort.sql` | Pendiente de evidencia | Los CHECK de cohorte >=1 están reflejados. Falta minimum_cohort del modelo v1; el cuerpo de cálculo intermedio fue sustituido después. |
| `202610230006_card_singleton_reference.sql` | Pendiente de evidencia | El boost singleton intermedio fue eliminado deliberadamente por v2/v3. No hay que restaurarlo. El inventario no acredita el estado de modelos/historial asociado al efecto de datos. |
| `202610230007_card_official_points_v2.sql` | Pendiente de evidencia | El código v2 fue sustituido correctamente por v3. Falta verificar la fila oncex-card-v2 y su specification; no se recalculan históricos. |
| `202610230008_card_accumulated_impact.sql` | Pendiente de evidencia | card_inputs, refresh_card_season y player_ovr_evolution coinciden exactamente en cuerpo con v3. Falta la fila oncex-card-v3, sus umbrales/approved/specification. |
| `202610250001_photo_background_removal_setting.sql` | Pendiente de evidencia | Tabla, singleton CHECK, RLS, políticas y permisos presentes. Falta verificar la fila singleton. false es un ajuste válido del administrador; no se forzará true. |

## Diferencias que bloquean una reparación indiscriminada

1. **202610100004**: falta la política de UPDATE del entrenador sobre su equipo. No aparece otra política con esa condición específica; el acceso efectivo por políticas genéricas depende de los permisos de negocio aún no exportados. No se debe añadirla durante una auditoría.
2. **202610120001**: `private.can_provision` coincide con el comportamiento anterior de 202610100003. En remoto, la rama del coach exige `kind='player'`; el archivo local amplía a `coach` y `player`. Marcarla aplicada ocultaría una diferencia real de autorización.
3. **202610220002**: faltan las dos funciones nuevas, el trigger de portero y la comprobación añadida a `save_match_lineup`. Que el editor móvil compruebe el portero no sustituye la protección de backend.

## Nueva migración de IA

Las tablas `teams`, `team_members`, `profiles`, el helper `private.can_manage_match_team` y los RPC actuales existen. `public.ai_match_context(uuid)` y `private.ai_match_request_budgets` no existen: la migración nueva no está materialmente aplicada en la instantánea.

Esto prueba sus dependencias básicas, no valida un despliegue ni soluciona la discrepancia histórica. No se ha ejecutado la migración de IA ni se ha propuesto ejecutar db push.

## Siguiente paso de solo lectura

Ejecutar `supabase/audits/20261030_reconciliation_readonly.sql` en el mismo SQL Editor como postgres y exportar `oncex_reconciliation_evidence`. Es un solo SELECT, sin escrituras ni funciones de recálculo. Devuelve configuración de negocio y conteos agregados, sin nombres, emails o IDs de jugadores. Permite contrastar:

- catálogo de roles/permisos y asignaciones entre roles;
- límites, visibilidad y MIME de ambos buckets;
- cuatro filas de pesos oficiales de match-v2;
- modelos Card v1/v2/v3 y sus especificaciones, umbrales y aprobación;
- mapping de categorías y fila de eliminación de fondo;
- cierre mensual, refresco diario y ausencia del cron antiguo de renovaciones;
- conteos de backfills e historial por versión, sin devolver registros personales.

Si esos datos cambiaron legítimamente por administración, se documentará la personalización; no se sobrescribirán para hacerlos coincidir con un valor inicial.

## Cómo reconciliar después, sin falsear historial

No hay todavía una lista autorizada de versiones para reparar ni un dry-run verificado que proponga solo IA.

- **Historial original**: solo se pueden registrar como cumplidas versiones cuyos efectos finales hayan quedado verificados. Las tres diferencias reales no desaparecen con una reparación de metadatos. Cualquier corrección de políticas/funciones/triggers sería un cambio explícito de esquema/autorización que necesita revisión aparte; no se ejecutarán los SQL antiguos completos.
- **Conservar exactamente el remoto actual**: una alternativa es adoptar una línea base fiel a ese estado, validada con esquema, grants y datos de configuración, y conservar los archivos antiguos en un archivo histórico fuera del directorio activo de migraciones. La línea base se registraría solo después de demostrar su equivalencia, sin ejecutarla sobre producción. La migración de IA quedaría como única posterior pendiente. Esto exige una decisión explícita: la línea base preserva, pero no corrige, las tres ausencias.
- Antes de cualquier futura escritura de historial: guardar un respaldo verificable de la base y una exportación de historial/esquema, preparar la operación concreta y comprobarla en una base desechable cuando esté disponible. Un dump de esquema no sustituye el backup de datos.
- No marcar ausencias como aplicadas para conseguir artificialmente un dry-run limpio. Con las 35 migraciones activas actuales, el inventario aportado no justifica que solo IA deba considerarse pendiente.

No se ha ejecutado ni indicado ningún comando de reparación o aplicación en esta entrega.

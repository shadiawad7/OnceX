# Reconciliación del historial después del parche aprobado

Propuesta preparada; ningún repair ejecutado. La auditoría inicial y el informe clasificaron 31 versiones como reflejadas y tres como ausentes. El parche y el postcheck remoto aprobados completan las tres: 202610100004, 202610120001 y 202610220002. Se conserva el informe original como evidencia histórica.

Inventario real: 35 archivos SQL, 35 versiones únicas; 34 incluidos en el informe previo y una migración IA excluida. Las 34 versiones del manifiesto se proponen como applied por equivalencia material final verificada; no se afirma reconstruir la ejecución histórica de cada sentencia. No se vuelve a ejecutar ninguno de sus SQL. Los hashes de los archivos actuales constan en history_reconciliation_manifest.json.

## Antes de autorizar

Confirmar en Supabase Dashboard que el project ref coincide con supabase/.temp/project-ref; el JSON del pre/postcheck identifica database=postgres pero por sí solo no identifica el proyecto. Guardar las exportaciones aprobadas y disponer del respaldo restaurable previsto. El postcheck aportado tiene historial vacío; si hay cambios posteriores, detenerse y revisar antes del repair. No usar supabase link automáticamente hacia otro proyecto.

## Comando propuesto (NO EJECUTADO)

Desde la raíz del repositorio, exclusivamente después de autorización explícita:

```bash
supabase migration repair --linked --status applied \
  202610100001 \
  202610100002 \
  202610100003 \
  202610100004 \
  202610100005 \
  202610100006 \
  202610100007 \
  202610110001 \
  202610110002 \
  202610110003 \
  202610120001 \
  202610120002 \
  202610120003 \
  202610140001 \
  202610140002 \
  202610170001 \
  202610180001 \
  202610180002 \
  202610180003 \
  202610200001 \
  202610210001 \
  202610210002 \
  202610210003 \
  202610220001 \
  202610220002 \
  202610230001 \
  202610230002 \
  202610230003 \
  202610230004 \
  202610230005 \
  202610230006 \
  202610230007 \
  202610230008 \
  202610250001
```

No se incluye la versión 202610300001. No pasar contraseñas en el comando ni compartirlas en el chat. El CLI podrá solicitar autenticación localmente. Este comando modifica el historial remoto: no aplica los SQL ni recalcula estadísticas.

## Comprobaciones posteriores, por orden

```bash
supabase migration list --linked
```

Resultado exigido: las 34 versiones del manifiesto en Local y Remote; 202610300001 solo en Local, Remote vacío; ninguna versión remota extra. Si el repair falla o queda parcial, guardar su salida y leer migration list antes de proponer cualquier reintento.

Solo si la lista coincide:

```bash
supabase db push --linked --dry-run
```

Resultado exigido: únicamente 202610300001_ai_match_drafts.sql pendiente. Si aparece otra migración o cualquier discrepancia, detenerse. No ejecutar db push sin --dry-run ni desplegar funciones. El resultado esperado no se presenta como comprobado: estos comandos aún no se han ejecutado.

Tras el repair, el rollback 04_rollback.sql preparado rechazará su ejecución porque exige historial vacío. No revertir el historial ni aplicar ese rollback automáticamente: requeriría un nuevo plan y autorización.

## Lista exacta

| Versión | Archivo | Base de reconciliación |
|---|---|---|
| 202610100001 | `202610100001_users_roles.sql` | Reflejada previamente |
| 202610100002 | `202610100002_super_admin.sql` | Reflejada previamente |
| 202610100003 | `202610100003_hierarchy_accounts.sql` | Reflejada previamente |
| 202610100004 | `202610100004_coach_manages_team.sql` | Delta completado y postcheck aprobado |
| 202610100005 | `202610100005_player_position.sql` | Reflejada previamente |
| 202610100006 | `202610100006_player_details.sql` | Reflejada previamente |
| 202610100007 | `202610100007_player_rankings.sql` | Reflejada previamente |
| 202610110001 | `202610110001_disable_manual_score.sql` | Reflejada previamente |
| 202610110002 | `202610110002_profile_photos.sql` | Reflejada previamente |
| 202610110003 | `202610110003_player_registration.sql` | Reflejada previamente |
| 202610120001 | `202610120001_coach_account_creation.sql` | Delta completado y postcheck aprobado |
| 202610120002 | `202610120002_club_photos.sql` | Reflejada previamente |
| 202610120003 | `202610120003_team_plans.sql` | Reflejada previamente |
| 202610140001 | `202610140001_team_plan_access.sql` | Reflejada previamente |
| 202610140002 | `202610140002_coach_names.sql` | Reflejada previamente |
| 202610170001 | `202610170001_admin_hierarchy_delete.sql` | Reflejada previamente |
| 202610180001 | `202610180001_coach_team_plans.sql` | Reflejada previamente |
| 202610180002 | `202610180002_scheduled_team_plans.sql` | Reflejada previamente |
| 202610180003 | `202610180003_team_plan_cron.sql` | Reflejada previamente |
| 202610200001 | `202610200001_match_lineups.sql` | Reflejada previamente |
| 202610210001 | `202610210001_oncex_single_plan.sql` | Reflejada previamente |
| 202610210002 | `202610210002_match_scoring_v2.sql` | Reflejada previamente |
| 202610210003 | `202610210003_ovr_monthly_history.sql` | Reflejada previamente |
| 202610220001 | `202610220001_unique_team_jerseys.sql` | Reflejada previamente |
| 202610220002 | `202610220002_live_jerseys_goalkeeper.sql` | Delta completado y postcheck aprobado |
| 202610230001 | `202610230001_match_result_consistency.sql` | Reflejada previamente |
| 202610230002 | `202610230002_away_win_bonus.sql` | Reflejada previamente |
| 202610230003 | `202610230003_card_calculation.sql` | Reflejada previamente |
| 202610230004 | `202610230004_card_first_appearance.sql` | Reflejada previamente |
| 202610230005 | `202610230005_card_any_cohort.sql` | Reflejada previamente |
| 202610230006 | `202610230006_card_singleton_reference.sql` | Reflejada previamente |
| 202610230007 | `202610230007_card_official_points_v2.sql` | Reflejada previamente |
| 202610230008 | `202610230008_card_accumulated_impact.sql` | Reflejada previamente |
| 202610250001 | `202610250001_photo_background_removal_setting.sql` | Reflejada previamente |

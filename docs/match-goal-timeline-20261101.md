# Goles encajados, cambios y portería a cero — 1 noviembre 2026

Implementado localmente por petición del usuario. El usuario confirmó cambiar el mínimo anterior (60 % de duración, 54 min en 90) a 60 minutos fijos.

## Flujo de revisión

Después de introducir el marcador aparece «Cambios y goles encajados». El entrenador añade cada cambio: sale, entra, minuto. Se pueden indicar salidas sin reemplazo por expulsión/lesión. El cálculo usa intervalos reales: salida de un titular en 60 -> 60 jugados, entrada de su sustituto en 60 hasta 90 -> 30. Un suplente que entra en 60 y sale en 80 juega 20; su reemplazo juega los 10 restantes, no 90-20.

Por cada gol recibido se exige su minuto. Si coincide con un cambio se debe elegir gol antes/después; no se elige silenciosamente. Se simula quién estaba en el campo y se calcula conceded_while_playing para todos. No hay reingreso de jugadores ni se permite sustituir un jugador que no esté jugando. Las actuaciones parciales no vinculadas requieren aclarar su cambio, en vez de ser convertidas automáticamente en 90 minutos.

«Verificar goles y cambios» actualiza minutos y encajados del formulario existente. Cuando se han encajado goles, esa verificación es obligatoria antes del resumen/confirmación. Cambiar minutos, tarjetas rojas, encajados personales, marcador, alineación o la propia cronología invalida la verificación. Se preserva confirm_match_statistics_v3 como único guardado oficial; no se calculan puntos nuevos en el intérprete IA.

La cronología es revisión local en memoria, no una nueva tabla de eventos. Al confirmar se guardan minutos y encajados personales mediante el modelo existente; al recargar/corregir una acta hay que verificar de nuevo los tiempos si se necesita esa revisión. No se inventan horarios a partir de un relato sin ellos. Minutos enteros 0..duración para cambios; 1..duración para goles, conforme al modelo actual de 90 minutos.

## Regla de portería a cero

Nueva migración pendiente: supabase/migrations/202611010001_clean_sheet_60_minutes.sql.
SHA-256: f403ea18bd7d2db5f0537590b5380e0fb09cdefb159bdfc37ab847995b5ea50a.

Sustituye la definición auditada de confirm_match_statistics_v3 cambiando únicamente mins>=ceil(m.duration*0.6) por mins>=60. Guarda de hash de la definición anterior y rol postgres; mismos firma/permisos/pesos y misma lógica restante. Añade RPC match_clean_sheet_minimum para que la app compruebe la regla del servidor. La vista previa también exige 60. La app permite preparar/revisar, pero no confirmar con esta regla mientras ese RPC no confirme su activación, evitando discrepancia con un backend aún en 54.

No se editan migraciones aplicadas, no hay backfill ni actualización de históricos. Afectará a futuras confirmaciones y a correcciones explícitas de actas que usan v3. No se ha aplicado en remoto ni desplegado ninguna función. La activación debe revisarse y autorizarse por separado; no hace falta cambiar el proveedor OpenAI.

## Verificación

- Node tests/*.cjs: 118/118 PASS, incluidos seis tests de cronología, orden de cambio/gol en el mismo minuto, suplente sustituido, expulsión, errores y huella de verificación.
- PostgreSQL 17.11 desechable, sin red/puertos: aplicación de migración PASS sobre definición auditada. clean_sheet_60_minutes.sql PASS con rollback: portero 59 min/0 encajados no recibe bonus; 60 min/0 encajados sí (6 puntos con participación y derrota); 60 min/1 encajado no (2 puntos por participación). Usa los RPC oficiales de alineación y confirmación.
- TypeScript y lint: exit 0. No llamadas reales a OpenAI ni operaciones remotas.

Archivos nuevos: src/lib/matchParticipation.ts, src/components/MatchParticipationReview.tsx, tests/matchParticipation.cjs, supabase/tests/clean_sheet_60_minutes.sql y la migración anterior. Modificados: match.tsx, matchScoring.ts y sus tests. Evidencias en supabase/reconciliation/20261031_three_deltas/goal_timeline_60_minutes/.

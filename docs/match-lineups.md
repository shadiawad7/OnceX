# Partidos, alineaciones y puntuación ONCEX

Aplicar una vez `supabase/migrations/202610200001_match_lineups.sql` después de las migraciones existentes. No necesita desplegar una Edge Function ni añadir un job Cron. Las pruebas locales están en `supabase/tests/match_lineups.sql`.

## Registro

En Equipo → Partidos, el entrenador asignado (o administrador del club/superadmin) crea un borrador con rival, fecha y duración, y selecciona exactamente 11 titulares distintos de la plantilla. Puede añadir los suplentes que hayan participado. El backend valida también que todos pertenezcan al equipo. La duración es editable para las distintas categorías.

Solo después de guardar los 11 se introducen resultado, minutos y acciones. Los minutos son obligatorios para cada titular/suplente aunque no tenga otros eventos. No se infieren 90 minutos por no aparecer en un relato. La opción explícita «Sin cambios» rellena la duración completa de los titulares y 0 para los suplentes; si hubo cambios se deben indicar sus minutos reales. El total no puede superar 11 veces la duración del partido. Las actuaciones y el resultado se guardan atómicamente tras la confirmación.

Un jugador con 0 minutos no suma partido jugado ni minutos. Puede conservar una sanción registrada; no se admiten goles/asistencias/propias con 0 minutos. El partido confirmado no se vuelve a confirmar ni editar desde esta primera versión. Volver a guardar la alineación de un borrador reinicia sus actuaciones. Si cambia la plantilla entre el borrador y la confirmación, hay que revisar la alineación.

## Las ocho estadísticas y puntos

| Estadística | Portero | Defensa | Centrocampista | Delantero |
| --- | ---: | ---: | ---: | ---: |
| Partido jugado (>0 minutos) | 1 | 1 | 1 | 1 |
| Minuto | 0,01 | 0,01 | 0,01 | 0,01 |
| Gol | 8 | 6 | 5 | 4 |
| Gol en propia | -3 | -3 | -3 | -3 |
| Asistencia | 3 | 3 | 3 | 2 |
| Amarilla | -1 | -1 | -1 | -1 |
| Roja | -3 | -3 | -3 | -3 |
| Portería a cero | 4 | 4 | 1 | 0 |

La portería a cero se registra cuando el rival termina con 0 goles y el jugador ha disputado al menos 60 minutos, según la regla confirmada por el usuario. Para el delantero puede contabilizarse esta estadística, pero aporta 0 puntos. La posición y nombre se guardan con la alineación: editar después la ficha no modifica los partidos anteriores.

Los puntos de cada partido se suman al ONCEX Score acumulado del jugador. Son puntos brutos, sin normalización ni límite 0–100: los valores negativos y mayores de 100 son válidos. La migración amplía el tipo numérico y retira la antigua restricción. Un trigger recalcula el total si se eliminan filas de actuaciones al borrar un partido/equipo. No se habilita la edición manual del score.

## Consulta

Estadísticas del jugador consulta los totales de partidos confirmados. Partidos muestra los resultados reales del equipo, su nombre/escudo y un resumen con fotos, alineación, minutos y acciones de todos los participantes. Se han retirado los ejemplos y el registro ficticio por IA del dashboard del jugador. La entrada por texto/voz y el análisis automático no están implementados: esta versión registra las estadísticas manualmente por el entrenador.

La consulta del resumen está limitada a miembros del mismo equipo y gestores autorizados. Los borradores solo son visibles para los gestores del partido. Un jugador no puede crear/confirmar partidos. Las tablas no tienen escritura directa concedida a authenticated/anon: los RPC validan permisos, pertenencias, XI y métricas en servidor.

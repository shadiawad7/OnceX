> Actualización: el cálculo real de campo está implementado en [Cálculo Card v1](card-calculation.md). Sus decisiones numéricas y migración sustituyen los apartados de modelo pendiente de este documento. Porteros siguen pendientes.

# Puntos de partido v2 y Card

## Separación

- `src/lib/matchScoring.ts`: tabla v2 por posición, umbrales y desglose de un solo partido. No obtiene ni guarda datos.
- Acumulados y estadísticas oficiales: requieren confirmación del entrenador en el servidor. No se calculan confiando en datos del cliente.
- `src/lib/cardOverall.ts`: únicamente los pesos OVR suministrados para DEL/MED/DEF. Recibe seis atributos ya calculados, no estadísticas ni puntos acumulados.
- La Card continúa con atributos y OVR pendientes (0 visual), sin muestras inventadas.

## Reglas precisas

Umbral de participación: redondeo al entero más cercano de duración × 2/3 (90→60, 80→53, 70→47). Bonificación +2, sin puntos por minuto ni por mera aparición.

Umbral de portería a cero: redondeo hacia arriba de duración × 60% (90→54, 80→48). Requiere 0 goles recibidos mientras el jugador participaba. No se deduce de los goles finales cuando hubo cambios.

Victoria +2 / empate +1 solo si minutos > 0. Los puntos pueden ser negativos. El desglose incluye participación, goles, propias, asistencias, amarillas, rojas, clean sheet y resultado.

## Migración preparada, pendiente de ejecutar en Supabase

Ejecutar `supabase/migrations/202610210002_match_scoring_v2.sql` después de las anteriores. No se ha ejecutado en Supabase remoto.

1. Añadir a cada actuación goles encajados mientras jugaba, desglose JSON y versión del sistema de puntos. Los goles encajados durante la participación son datos de contexto para verificar una clean sheet, no una novena estadística de rendimiento.
2. Sustituir la confirmación por una función verificada que aplique v2 en el servidor. Guardar la tabla de pesos versionada en un único lugar del servidor.
3. Añadir revisiones oficiales con motivo, autor, fecha, instantánea previa y control de versión para impedir correcciones concurrentes. El entrenador confirma la revisión y se recalculan los totales mediante sustitución, sin sumar dos veces.
4. Conservar puntos históricos y su versión. No recalcular partidos anteriores al instalar la migración. Recalcularlos solo al corregir oficialmente un partido.
5. Registrar una temporada explícita por partido para acumular y consultar puntos por temporada sin deducir su calendario arbitrariamente ni atribuir temporadas a partidos históricos sin revisión.

El editor tendrá que pedir el contexto de goles encajados por jugador cuando el rival haya marcado. Un jugador que sale sin recibir goles conserva su clean sheet si supera el umbral aunque el equipo encaje después.

## Pendiente para calcular atributos reales y OVR

El documento define qué datos utilizar y los pesos OVR de los jugadores de campo, pero no concreta:

- fórmulas de FIN/CRE/IMP/DIS/REG/EFI y POR/SEG;
- método de normalización, población mínima, empates y tratamiento de valores extremos;
- nivel neutral y factores numéricos de fiabilidad para cada tramo;
- denominador de participación (partidos posibles y minutos reglamentarios elegibles del jugador);
- ponderaciones OVR de porteros;
- delimitación de categorías comparables y temporada.

No se inventan estos valores ni una población ficticia. La función de pesos no se conecta a la Card hasta contar con atributos reales y la política de fiabilidad.

## Verificación

`node --test tests/matchScoring.cjs` comprueba los tres ejemplos oficiales (14, 10 y 6), umbrales independientes, clean sheet tras sustitución, no participantes, pesos por posición, puntos negativos y el ejemplo OVR 89.


## Uso

En Equipo → Partidos, el entrenador confirma con temporada explícita y goles encajados mientras jugaba cada participante. Si el rival termina con 0 goles, todos estos valores son 0. La acción «Sin cambios» rellena el resultado recibido para quienes jugaron todo el partido; si hubo sustituciones, deben registrarse sus valores reales.

«Corregir datos oficiales» permite corregir estadísticas y resultado de la alineación existente. Requiere un motivo de al menos ocho caracteres y revisión coincidente. No permite cambiar silenciosamente los 11 titulares de un partido confirmado; las correcciones de alineación/duración requerirían un flujo adicional. «Ver historial de revisiones» muestra motivo y fecha. La auditoría conserva además instantáneas anterior/posterior, autor y revisión.

`player_season_points(player,season)` consulta el acumulado por temporada explícita. El campo heredado `profiles.oncex_score` y los rankings actuales conservan el acumulado general compatible, incluyendo partidos históricos aún sin temporada. No se borran ni se asignan temporadas retrospectivas. La selección de temporada en los rankings es un trabajo posterior; no debe confundirse el acumulado general con el acumulado de una temporada.

El servidor conserva su tabla versionada en `private.match_scoring_weights`; la configuración TypeScript equivalente sirve para lógica/previas y pruebas del cliente. La confirmación oficial siempre calcula en el servidor, sin aceptar puntos enviados por el cliente. El desglose forma parte del resumen del partido.

## Victoria visitante (v3)

Ejecutar `202610230002_away_win_bonus.sql` después de las anteriores. Añade `venue` (home/away) al partido, sin asignar localía ni recalcular puntos de partidos históricos. El registro exige elegir LOCAL o VISITANTE. Las correcciones oficiales pueden modificar esa condición y quedan auditadas con la revisión.

La versión v3 reutiliza íntegramente la fórmula v2 y añade únicamente `awayWin`: +1 si venue=away, victoria y minutos >=60. El límite es siempre 60 minutos para este bonus, independiente de la duración reglamentaria de partidos históricos. Empate, derrota, local, no participantes o menos de 60 minutos: +0. No modifica el Overall ni las ocho estadísticas oficiales.

La vista previa se actualiza al cambiar localía, resultado o minutos. El servidor confirma con `confirm_match_statistics_v3` y vuelve a calcular la puntuación completa. Los clientes antiguos no pueden seguir confirmando con la versión anterior que omitía la localía. `supabase/tests/away_win_bonus.sql` comprueba el corte 59/60, ausencia de cambios en otras reglas, almacenamiento de la localía, empate/derrota y correcciones.

> Modelo vigente: [Card v2 con puntos oficiales](card-official-points-v2.md), migración 202610230007. Lo siguiente documenta versiones anteriores; la referencia virtual 99 ya no se aplica.

# Cálculo ONCEX Card v1

Ejecutar, tras revisar, `202610230003_card_calculation.sql`, después de las migraciones de identidades, historial OVR y partidos. Preparada y probada localmente; no ejecutada en Supabase remoto. No añade tablas ni columnas, ni modifica puntos, pesos, RPC de confirmación o estadísticas históricas.

## Decisiones numéricas de esta implementación

Los pesos OVR vienen del usuario. Las siguientes decisiones completan las definiciones conceptuales y son configuración inicial, no fórmulas previamente proporcionadas por el usuario:

- Mínimo actualizado por `202610230004_card_first_appearance.sql`: 5 jugadores comparables (incluido el propio), cada uno desde su primera aparición confirmada con minutos positivos. Ya no se exigen 2 partidos ni 90 minutos. El factor de fiabilidad mantiene la protección de las muestras pequeñas.
- Neutral: 50. Fiabilidad = mínimo de 1, minutos/900 y partidos/10. Por ejemplo 2 partidos y 90 minutos → 10%; 10 partidos completos de 90 → 100%.
- Unidades de participación = suma de minutos/duración reglamentaria de cada actuación. Permite comparar producción por partido completo equivalente, incluso con duraciones distintas. Sin minutos no hay ratios ni valoración.
- Oportunidades: partidos confirmados de los equipos en los que el jugador tiene actuaciones, desde su primera participación registrada en cada equipo. No se presumen convocatorias, lesiones ni disponibilidad previa: la app todavía no conserva ese contexto histórico. Con un traspaso, puede contar partidos del equipo anterior posteriores a su marcha; un futuro modelo necesitará intervalos históricos de pertenencia para perfeccionar REG.
- Catálogo actual: correspondencia explícita a Cadete, Juvenil y Amateur entre sus divisiones. Categorías históricas desconocidas solo se comparan por su texto exacto; nunca se infiere una categoría a partir del nombre del equipo. Se puede revisar el mapa antes de ejecutar.

## Atributos

Sea U la participación en partidos equivalentes, P la proporción de minutos jugados respecto de los disponibles y G/A/CS/PP los goles/asistencias/porterías a cero/propias confirmados:

- FIN: G / U.
- CRE: A / U.
- Producción: DEF = 6G + 4A + 3CS − 4PP; MED = 5G + 3A + 2CS − 3PP; DEL = 4G + 2A + CS − 2PP.
- IMP: producción / U × (0,5 + 0,5P).
- DIS: −(amarillas + 3 × rojas) / U.
- REG: 0,5 × proporción de partidos disputados + 0,5 × P.
- EFI: producción / U.

La producción es una fórmula propia de atributos, versionada en el modelo: no lee los puntos del partido, resultados, bonus de visitante ni acumulados. Solo utiliza las ocho estadísticas oficiales y su contexto de participación.

Cada métrica se normaliza dentro de misma posición, categoría y temporada en toda ONCEX. Percentil de rango medio: 99 × (jugadores inferiores + (empatados−1)/2)/(población−1). Los empates reciben igual valoración; si todos empatan quedan en 49,5. DIS ya tiene orientación positiva (menos penalización = mejor). No se publican fichas ni poblaciones de otros clubes a los clientes.

Atributo final = redondear(50 + fiabilidad × (percentil − 50)). Así, con fiabilidad 10%, incluso el percentil máximo queda en 55. No se aplica dos veces la fiabilidad al Overall.

OVR = suma ponderada de los seis atributos enteros, redondeada una sola vez:

| Posición | FIN | CRE | IMP | DIS | REG | EFI |
|---|---:|---:|---:|---:|---:|---:|
| DEL | 25% | 15% | 25% | 10% | 10% | 15% |
| MED | 15% | 25% | 20% | 10% | 15% | 15% |
| DEF | 10% | 10% | 30% | 15% | 20% | 15% |

Los porteros quedan pendientes: no se inventa un modelo POR/SEG ni sus pesos.

## Integración e histórico

Al confirmar/corregir un partido se recalcula la temporada y todos sus grupos, porque la actuación de un jugador puede cambiar la referencia de los demás. Se guardan nuevas valoraciones inmutables con atributos, versión, fiabilidad y tamaño de población; no se sobreescribe ninguna valoración ni cierre mensual.

La RPC existente alimenta la Card y Evolución, selecciona la temporada por fecha del último partido confirmado y oculta una valoración actual si el grupo ha perdido su muestra mínima. Sin datos suficientes no muestra una valoración ficticia: el cero visual se acompaña de un mensaje de falta de muestra.

Si Cron existe, se programa un refresco diario a las 21:50 UTC. El cierre mensual ya preparado en la migración 202610210003 guarda la última valoración real de cada mes terminado, a las 02:10 UTC del día 1. Los meses cerrados no se recalculan tras corregir un partido. La instalación calcula valoraciones actuales de temporadas existentes, pero no reconstruye valores mensuales pasados. Sin Cron hay cálculo al confirmar/corregir; hay que habilitar/programar Cron para el refresco diario y cierre mensual automático.

Escalabilidad: esta primera versión recalcula por temporada dentro de la confirmación, de forma síncrona y serializada. Con una población grande convendrá mover el trabajo a una cola privada, conservando el mismo modelo y el control de datos oficiales.

## Validación

`supabase/tests/card_calculation.sql`: comparación entre clubes, mínimos, baja fiabilidad, empate, pesos, separación de puntos, lectura de la Card, pérdida de población, temporada y permisos. Fixtures sintéticas con rollback. La suite existente de puntos verifica además el ejemplo DEL 88,9 → 89 en la función ponderada.

## Sin mínimo de comparables

La migración 202610230005 permite un solo jugador en el grupo. Con uno, los percentiles son neutrales (50), porque no existe comparación relativa; no se le atribuye el mejor rendimiento de ONCEX. Con dos o más se usa el rango medio real. Se conservan fiabilidad y separación de puntos. Relaja únicamente las restricciones de mínimo de población en modelos/valoraciones existentes.

## Referencia virtual para un solo jugador

Por petición del usuario, 202610230006 aplica únicamente a grupos de un jugador: OVR final = redondear((OVR base + 99)/2). Los seis atributos conservan su cálculo; se trata de una excepción explícita al OVR ponderado. Actualmente el OVR base sin comparables es neutral 50, por lo que queda en 75, no en una valoración individual 80 inferida de datos inexistentes. La referencia 99 no se inserta como jugador, no cuenta como comparable real ni cambia los puntos de partido. Desde dos comparables vuelve a utilizarse exclusivamente el cálculo relativo normal.

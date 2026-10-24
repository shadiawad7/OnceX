> Actualización: el cálculo real de campo está implementado en [Cálculo Card v1](card-calculation.md). Sus decisiones numéricas y migración sustituyen los apartados de modelo pendiente de este documento. Porteros siguen pendientes.

# Evolución mensual del OVR

La evolución usa exclusivamente valoraciones OVR reales y snapshots mensuales. Nunca utiliza `profiles.oncex_score`, puntos por partido ni su acumulado. La Card y la evolución consultan la misma valoración real disponible; sin modelo aprobado muestran 0 como estado pendiente, sin puntos ficticios en la gráfica.

## Migración preparada

Revisar y ejecutar `supabase/migrations/202610210003_ovr_monthly_history.sql` después de las migraciones anteriores. No se ha ejecutado en Supabase remoto.

- Modelos versionados con aprobación, especificación y mínimos de población/participación explícitos. No se configura ningún umbral ni fórmula arbitraria.
- Valoraciones OVR de 0–99 y exactamente seis atributos válidos según posición, con temporada, categoría canónica, fecha/corte de datos y fiabilidad. Se rechazan valoraciones sin modelo aprobado o sin los mínimos de su política.
- Histórico de valoraciones y snapshots mensuales inmutables. Una nueva valoración o corrección futura no modifica cierres anteriores.
- `player_ovr_evolution` devuelve la valoración actual, el primer OVR válido de la temporada y los cierres mensuales, solo al propio jugador o a quien pueda editar su ficha.
- El servicio privado `close_ovr_month` guarda la última valoración válida registrada en cada mes terminado. No cierra meses abiertos, no duplica cierres y no inventa ni rellena meses sin valoración. No recalcula meses ya cerrados.
- Si Cron ya está disponible, programa el cierre del mes anterior a las 02:10 UTC del día 1. Sin Cron muestra un NOTICE; no instala extensiones. La integración del algoritmo real debe garantizar un cálculo al cierre de mes y habilitar/verificar el trabajo antes de usarlo en producción.
- Ningún usuario de la app puede escribir OVR arbitrarios, ni siquiera el superadmin. La escritura queda para el futuro servicio de cálculo aprobado en el servidor.

## Comparación ONCEX

La función privada `ovr_comparable_population` incluye jugadores de todos los clubes registrados, agrupados por misma posición, categoría canónica y temporada. Aplica los mínimos de participación del modelo. No filtra silenciosamente por equipo/club ni devuelve esta población a clientes móviles.

Las categorías competitivas actuales requieren una correspondencia explícita en `ovr_category_mapping` (por ejemplo, las divisiones juveniles a una categoría comparable aprobada). La tabla empieza vacía: no se deduce la categoría por el nombre del equipo. La comparación usa las posiciones de las actuaciones oficiales. La asignación competitiva del equipo se consulta al evaluar; para clasificaciones históricas completamente reproducibles, el futuro modelo deberá versionar también esa correspondencia y su contexto de entrada.

La falta de modelo o de datos se muestra como pendiente/muestra insuficiente. No se calcula ningún percentil, no se inventan comparables ni se usa el ranking del club como sustituto. Los rankings existentes mantienen sus ámbitos y puntos.

## Interfaz

`PlayerEvolution` muestra OVR actual, diferencia contra el primer OVR válido de la temporada y línea mensual con puntos: verde al subir, rojo al bajar, neutro al mantenerse. Al pulsar el punto o su mes se muestra mes, OVR y cambio respecto al anterior mes registrado. La gráfica permite desplazamiento horizontal en móviles. Sin snapshots se muestra el estado vacío.

## Pendiente del modelo real

Siguen pendientes fórmulas exactas de atributos, normalización, población mínima aprobada, nivel neutral, coeficientes de fiabilidad, ponderación OVR de porteros y versionado de categorías comparables. No se modifica la fórmula de puntos de partido v2. No se precargan mocks en producción.

## Validación

`supabase/tests/ovr_monthly_history.sql` usa exclusivamente una política y valoraciones sintéticas dentro de una transacción de pruebas que revierte: inmutabilidad, cierre idempotente, rechazo del mes abierto, diferencia de temporada, aislamiento de temporadas, permisos y población entre dos clubes con exclusión de otras posiciones/categorías.

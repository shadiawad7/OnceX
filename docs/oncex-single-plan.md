# ONCEX: plan único y licencias

## Interfaz

ONCEX cuesta como referencia 399 céntimos por jugador activo al mes, sin cuota fija por club. El reparto comercial de referencia es 10% club y 90% ONCEX. No hay pasarela, cobros ni facturas automáticas.

La interfaz muestra un único producto y no programa cambios de nivel. Audio e IA forman parte del producto, pero su implementación sigue pendiente; no se presentan como servicios ya operativos.

Estadísticas incluye una flecha para abrir ONCEX Card. Foto, nombre, posición, equipo/categoría, dorsal y Score provienen de la ficha. Los atributos están pendientes (`null`), sin valores inventados ni escritura en estadísticas oficiales.

## Migración preparada — pendiente de ejecutar en Supabase

Ejecutar `supabase/migrations/202610210001_oncex_single_plan.sql` después de las migraciones anteriores. No se han cambiado las migraciones existentes ni la base de datos remota. La migración crea las identidades existentes, pero ninguna licencia activa ni deuda histórica.

La migración:

- Sustituye las restricciones funcionales por acceso al producto ONCEX, manteniendo los permisos por club, y desactiva las funciones y el Cron de cambio de nivel.
- Crea identidades permanentes, licencias por jugador/club, periodos mensuales y eventos de activación, baja y reanudación en tablas privadas sin escritura directa desde la API.
- Conserva el historial cuando se elimina la cuenta y programa el fin económico de sus licencias al terminar el periodo vigente.
- Guarda el precio y reparto en cada periodo. Impide eliminar clubes con historial económico y no genera deudas históricas de jugadores existentes.

La pantalla Plan del equipo permite activar, programar la baja y cancelar una baja de jugadores reales, con confirmación. Requiere ejecutar la migración. Esta también desbloquea los rankings por club conservando los permisos de lectura por club.

`private.player_identities` conserva el ID aunque se elimine el perfil. Una cuenta nueva con el mismo email recupera automáticamente el ID; si cambia de email, el superadmin debe recuperar expresamente la identidad mediante `recover_player_identity(permanent_id,target_player)`. No se puede detectar automáticamente que dos personas con diferentes emails son la misma; el administrador debe recuperar el ID en esos casos.

`club_licence_periods(target_club,range_start,range_end)` devuelve el libro comercial por fecha de inicio del periodo (intervalo semiabierto), incluyendo cuentas eliminadas. Solo gestores del club/superadmin; no realiza cobros ni emite facturas. Las renovaciones se materializan al consultar licencias/libro o modificar una licencia, incluso si la app estuvo cerrada. No necesita Cron. El redondeo de referencia se realiza por licencia: 399 céntimos = 40 club + 359 ONCEX.

Los clubes con historial de licencias no pueden eliminarse físicamente por la integridad referencial; el historial permanece. Los campos antiguos de equipo se conservan como datos inertes de compatibilidad, sin controles funcionales ni cambios programables desde la app. Las migraciones históricas se mantienen intactas.

## Atributos de la Card

Definir una fórmula versionada antes de publicarlos: población comparable, posición, mínimo de minutos/partidos, intervalo temporal y normalización. El Score oficial existente se conserva como puntuación acumulada; no convertirlo a 0–100 sin una especificación aprobada.

## Card: contrato visual actualizado

La Card muestra seis atributos, con el mismo orden para DEF/MED/DEL: FIN, CRE, IMP, DIS, REG, EFI. Porteros: POR, SEG, IMP, DIS, REG, EFI. No se utilizan datos de velocidad, físico, pases, paradas ni otras métricas no registradas.

`src/lib/oncexCard.ts` define el contrato de presentación y las abreviaturas de posición. `src/data/oncexCardDemo.ts` contiene exclusivamente las muestras estáticas del diseño (OVR 88 campo / 87 portero). La ficha proporciona esas muestras a la vista; la Card marca tanto el OVR como los atributos como demostración. Los datos personales y la foto siguen siendo reales. No se guarda ninguna valoración demo ni se utiliza el Score como Overall.

La futura salida calculada incluirá versión del modelo, variante, OVR y atributos de 0–99. Su cálculo queda pendiente: comparación por posición, categoría/edad y temporada, normalización por minutos, ponderación por posición y fiabilidad según participación. No existe aún una fórmula de atributos/OVR y no se modifica la fórmula oficial de Score.


Actualización: retiradas las muestras numéricas de la Card. `oncexCardAttributes.ts` define los seis atributos de cada variante con valores nulos y estado pendiente; la interfaz muestra 0 hasta disponer de un cálculo aprobado. No se utilizan valoraciones demo ni se deducen atributos/OVR del Score acumulado.

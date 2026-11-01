# Tres deltas de reconciliación — propuesta no ejecutada

No son migraciones nuevas. Estos archivos están fuera de `supabase/migrations` y no serán recogidos por un despliegue normal de migraciones.

## Archivos

- `01_precheck_readonly.sql`: un SELECT de catálogos/configuración. Exportar su resultado completo.
- `02_patch.sql`: transacción con comprobaciones de deriva y exclusivamente los tres deltas autorizables. **No ejecutada**.
- `03_postcheck_readonly.sql`: un SELECT para comprobar definiciones, atributos, ACL, política, trigger y funciones/configuración protegidas.
- `04_rollback.sql`: reversión DDL protegida; restaura las dos definiciones auditadas y elimina solo lo creado por el parche. **No ejecutada**.
- `manifest.json`: hashes de las migraciones originales, definiciones auditadas y artefactos propuestos.
- `validate_artifacts.py`: comprobación estática local; nunca conecta a una base de datos.

Fuente de las definiciones anteriores: auditoría remota aportada por el usuario del 30 de octubre de 2026. La comparación de configuración utilizó también `oncex_reconciliation_evidence.txt` del 31 de octubre. El parche exige que esas definiciones, propietarios y ACL sigan idénticos. Si no coinciden, se detiene; no se cambia el hash para forzar el paso sin una nueva auditoría.

## Cambios exactos

1. Crear la política ausente `public.teams.teams_update_assigned_coach` con su condición original de entrenador asignado.
2. Sustituir únicamente `private.can_provision(uuid,text,uuid,uuid)` para ampliar la creación de cuentas del coach a coaches y players de sus equipos. CREATE OR REPLACE conserva identidad/OID, propietario y ACL existentes.
3. Crear `public.team_jersey_numbers(uuid,uuid)` y sus permisos originales; sustituir `public.save_match_lineup(...)` añadiendo únicamente el guard de portero; crear `private.require_starting_goalkeeper()` y el trigger BEFORE UPDATE `match_requires_goalkeeper`, con las revocaciones originales del helper.

Las nuevas funciones se crean con CREATE, no CREATE OR REPLACE. Si ya existe alguno de esos nombres se aborta y se revisa. No se usa IF NOT EXISTS para silenciar deriva.

El cuerpo de save_match_lineup mantiene las sentencias normales de INSERT/UPDATE/DELETE que ya existían. **Definir la función no ejecuta esas sentencias.** El parche no llama a esta función, no modifica registros, no confirma partidos, no recalcula puntos/Card/OVR y no crea snapshots ni jobs. Las nuevas validaciones afectan a operaciones futuras, incluidas correcciones de partidos confirmados; no recorren ni validan retroactivamente los partidos existentes.

## Secuencia propuesta para una aplicación futura, solo tras revisión/aprobación

1. Obtener un respaldo restaurable de datos, esquema y permisos, y una copia del historial. Verificar la restauración en un entorno desechable cuando esté disponible. No basta con guardar definiciones de funciones.
2. Evitar cambios concurrentes de esquema/permisos/configuración durante la operación. Comprobar la identidad del proyecto en el Dashboard; `current_database()` suele ser postgres en varios proyectos y no identifica por sí solo el proyecto correcto.
3. Ejecutar **solo 01** en el SQL Editor del proyecto correcto como postgres y exportar el JSON completo. `run_as_postgres`, `existing_functions_match`, `protected_functions_match`, los tres `*_absent`, `public_function_defaults_match` y `history_still_empty` deben ser true. Guardar también `existing_functions_backup`, `protected_configuration` e `history_versions`.
4. Si una comprobación falla, parar. Si el historial ya no está vacío, revisar las nuevas entradas; este parche está preparado para el historial vacío auditado y no lo reparará.
5. Ensayar 02 y 04 en una copia desechable fiel al remoto antes de aprobar su uso en producción. Las comprobaciones estáticas de Python no sustituyen este ensayo.
6. Una vez aprobado, aplicar **02 completo y una sola vez** en una transacción. `lock_timeout=5s` y `statement_timeout=30s` limitan esperas. Ante un error, el cliente debe finalizar la transacción abortada con ROLLBACK antes de continuar; no copiar solo las sentencias posteriores al error ni forzar sus condiciones.
7. Ejecutar **solo 03**, exportar el JSON y comparar con 01. Todos los checks de coincidencia/permisos deben ser true. Los JSON `protected_configuration` y `history_versions` deben seguir idénticos. Revisar también las definiciones/ACL devueltas. Las funciones protegidas cubren los RPC oficiales, puntos y Card/OVR, además de los helpers dependientes.
8. No ejecutar RPC mutadores como prueba sobre producción. Comprobar las conductas de coach, dorsales y portero en el entorno desechable: coach asignado frente a ajeno; creación de coach/player dentro/fuera del equipo; alineación y confirmación con/sin portero; dorsales sin revelar identidades; rechazo de anon; conservación de los cálculos existentes.
9. Solo después de comprobar los tres deltas se propondrá una reparación de historial separada con la lista verificada de 34 versiones. No se registra IA como aplicada. Ningún archivo de esta carpeta modifica `supabase_migrations`.
10. El objetivo posterior será una simulación que proponga únicamente `202610300001_ai_match_drafts.sql`; no se ha ejecutado ni certificado aún ese resultado.

## Reversión

- Si 02 falla antes del COMMIT, su transacción se revierte: no ejecutar 04 como sustituto de ROLLBACK.
- Si 02 terminó correctamente pero hay que revertirlo, guardar primero 03 y revisar 04. La reversión presupone historial todavía vacío y ausencia de cambios posteriores en los objetos; sus guardas lo comprueban. Si el historial ya se reparó, se necesita un plan de reversión de metadatos aparte. No se incluye ni se ejecuta automáticamente.
- Tras aprobación, ejecutar 04 completo como transacción. El orden elimina el trigger antes de su función, la nueva RPC y la nueva política; restaura las dos funciones exactamente como estaban auditadas. No hay CASCADE: una dependencia registrada en catálogos causa error y rollback completo. PostgreSQL no registra todas las referencias escritas dentro de cuerpos de función como texto ni las llamadas desde aplicaciones; revisar también esas dependencias lógicas y no usar esta reversión automáticamente tras cambios posteriores.
- Volver a ejecutar 01. Deben reaparecer los hashes/ACL anteriores y estar ausentes los objetos añadidos; configuración protegida e historial deben seguir iguales a los guardados antes de 02.
- La reversión no elimina cuentas/acciones legítimas realizadas mientras los permisos estuvieron ampliados, ni deshace correcciones de partidos hechas durante esa ventana. No es una restauración de datos. Revertir desactiva de nuevo la protección backend de portero y la ampliación de permisos.

## Estado de validación

Solo se han preparado archivos y realizado comprobaciones estáticas locales. No se ha ejecutado el parche, las consultas de pre/post ni la reversión contra el remoto. No se ha hecho migration repair, db push, despliegue ni cambios de fórmulas/datos. El ensayo PostgreSQL del parche y su reversión sigue pendiente; no se marca como superado.

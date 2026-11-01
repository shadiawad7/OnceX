# Revisión final IA Match Drafts — 2026-10-31

Revisión local, sin push, secrets ni despliegue. El usuario informa de 34 versiones reconciliadas y dry-run con únicamente 202610300001 pendiente. No se ha repetido ninguna operación contra producción en esta revisión.

## Resultado y hallazgo pendiente

La migración nueva crea exclusivamente private.ai_match_request_budgets y public.ai_match_context(uuid), con RLS/revocaciones/grant. No sustituye funciones oficiales ni contiene backfills o recálculos. El contador es una escritura operativa; la generación no guarda partidos.

Hallazgo de consumo: hay bloqueos useRef/busy en móvil y no hay reintentos automáticos del adaptador OpenAI, pero NO hay idempotencia del lado servidor. Dos POST iguales, desde dispositivos distintos o después de una respuesta perdida, pueden producir dos consumos. El límite atómico de 30 solicitudes por usuario/hora no deduplica. Se recomienda resolver antes de abrir producción si se exige evitar dobles consumos. No se ha cambiado la implementación ni la migración durante esta revisión. Una solución futura necesita clave de solicitud validada/ligada al usuario y carga, exclusión concurrente y reutilización controlada del resultado; requeriría pruebas nuevas y revisión del SQL/dry-run si añade objetos.

El contador usa ventanas horarias fijas, no ventanas móviles; permite ráfagas al cambiar de hora. Es global por usuario, no por equipo, y cuenta intentos después de autorización incluso si posteriormente falla OpenAI. Un audio supone una solicitud de cuota pero hasta dos llamadas pagadas. El RPC puede llamarse directamente por un usuario autorizado y gastar su propia cuota, sin llamar a OpenAI. No hay límite global de gasto/concurrencia ni borrado global programado de contadores de usuarios inactivos: se limpia al volver a solicitar. No confundir cuota con un límite económico garantizado.

## Seguridad y flujo

- JWT verificado explícitamente con auth.getUser antes de recuperar plantilla o llamar al proveedor. verify_jwt=false en config.toml delega esta verificación al handler, no hace público el acceso a la IA. El cliente Supabase conserva el JWT del usuario; no usa service-role.
- RPC SECURITY DEFINER, search_path vacío, autorización mediante can_manage_match_team. Tabla privada con RLS sin políticas de cliente. Anon sin EXECUTE; authenticated tiene EXECUTE del RPC pero no SELECT/INSERT directo al contador (verificación local).
- Contexto del servidor solo con player_id y player_name. No se confía en plantilla, modelo ni permisos enviados por móvil. El texto libre del entrenador se envía tal cual: la minimización de columnas no elimina datos personales que este incluya en su relato.
- Structured Outputs estricto con additionalProperties=false y parseo/validación en servidor y móvil. IDs/candidatos restringidos a plantilla. Identificación incierta exige revisión humana. Datos omitidos siguen null. Las advertencias no sustituyen la validación oficial.
- Revisión única para voz/texto; aplica al editor habitual, guarda alineación con save_match_lineup_v2 y confirma únicamente con confirm_match_statistics_v3. SQL local demuestra igualdad de actuaciones/puntos para payloads manual/IA equivalentes. No hay una fórmula paralela de puntos/OVR.
- Límites de entrada 12000 caracteres, audio 10 MB, cuerpo multipart 11 MB; tipo/cabecera comprobados; plantilla máxima 100. Móvil graba hasta 120 s; backend NO verifica duración real del audio. Timeout de 55 s por llamada, hasta dos llamadas secuenciales por voz, timeout móvil 125 s.
- No se registran clave/prompts/respuestas explícitamente en código; errores del proveedor se traducen a mensajes controlados. Responses store:false. Esto no implica retención cero del proveedor. Borrador/transcripción quedan en memoria; audio local se elimina best effort.

## Pruebas ejecutadas

- node --test tests/*.cjs: 93/93 PASS, 0 omitidas (22 pruebas IA), proveedor/Supabase simulados, sin llamadas pagadas.
- npx tsc --noEmit: exit 0.
- npx expo lint: exit 0.
- npx tsc -p /private/tmp/oncex-ai-typecheck/tsconfig.json: exit 0; usa declaraciones locales Deno y tipos reales de Supabase, NO equivale a deno check ni bundling/ejecución real.
- PostgreSQL local 17.11, imagen supabase/postgres:17.11.0.003, contenedor sin red/puertos: aplicación de las 35 migraciones PASS; supabase/tests/ai_match_drafts.sql PASS con ROLLBACK. Prueba autorización, minimización, petición 31 rechazada y equivalencia de actas mediante RPC oficiales.
- Comprobación adicional local: anon_rpc=false, authenticated_rpc=true, authenticated_budget_select=false, authenticated_budget_insert=false, budget_rls=true.
- Intento de suite SQL completa se detuvo en admin_hierarchy_delete.sql: fixture antiguo sin email, incompatible con ensure_player_identity de una migración posterior. NO pasó la suite SQL completa. No se ha modificado el test ni desactivado el validador para ocultarlo.
- Pendiente: bundling/deno check y ejecución real Edge Runtime; grabación real iOS/Android/web; precisión/latencia/acceso efectivo a modelos OpenAI con la cuenta de producción; pruebas de concurrencia/idempotencia (esta última no implementada). Docker ya no es el bloqueo de la prueba SQL IA.

Logs: supabase/reconciliation/20261031_three_deltas/ai_final_review/.

## Secrets

En Supabase Dashboard del proyecto correcto → Edge Functions → Secrets, guardar por separado:

| Nombre | Valor |
|---|---|
| OPENAI_API_KEY | Clave privada de un proyecto OpenAI con facturación y acceso a los modelos |
| OPENAI_MATCH_MODEL | gpt-5-mini |
| OPENAI_TRANSCRIPTION_MODEL | gpt-transcribe |

Los modelos son valores iniciales recomendados por compatibilidad con este adaptador; confirmar acceso de la cuenta con smoke test real. El código ya usa esos defaults. No configurar EXPO_PUBLIC_OPENAI_API_KEY, no escribir clave en móvil, Git, comandos con literal ni chat. SUPABASE_URL y SUPABASE_ANON_KEY proceden del entorno Edge; no se necesita service-role para esta función. Configurar límites/alertas de uso en OpenAI, sin asumir que alertas son cortes de gasto.

## Orden futuro de producción (NO ejecutado)

1. Resolver o aceptar explícitamente la limitación de idempotencia. Si se modifica código/SQL, repetir pruebas y revisión. Verificar bundling/ejecución local de la Edge Function antes de considerarla validada end-to-end.
2. Confirmar proyecto enlazado y proyecto del móvil, respaldo previsto y archivos revisados. Leer `supabase migration list --linked` y ejecutar `supabase db push --linked --dry-run`. Debe seguir pendiente solo 202610300001; si cambia el SQL tras una corrección, revisar ese SQL actualizado.
3. Solo con autorización, `supabase db push --linked`. Revisar que aplica únicamente esa migración. Leer `supabase migration list --linked`: 35 versiones alineadas. Comprobar existencia/RLS/grants de los dos objetos nuevos mediante lectura del catálogo, sin llamar al RPC para inspeccionar permisos (el RPC consume cuota).
4. Crear los tres secrets en Dashboard como arriba, sin copiarlos al repo.
5. Solo con autorización, `supabase functions deploy ai-match-draft --project-ref TU_PROJECT_REF`. Sustituir por el ref verificado. Desplegar únicamente esa función; mantener verify_jwt=false con autenticación explícita del handler. No usar --prune ni desplegar todas las funciones.
6. Probar primero texto con un entrenador autorizado y nombres reales de su equipo. Revisar borrador, desconocidos y ambigüedades SIN confirmar un partido de prueba en un equipo real. Verificar además sesión inválida y equipo ajeno sin acceso. No volcar tokens, claves o relatos privados a logs compartidos.
7. Probar voz en un dispositivo con binario SDK58/expo-audio y permisos actualizados; OTA no añade módulos/permisos nativos. Revisar transcripción y mismo flujo. Usar equipo de prueba autorizado para confirmar y verificar resultado oficial, evitando ensuciar históricos reales.
8. Comprobar métricas de errores/latencia/consumo antes de ampliar uso. Si falla la IA, mantener registro manual; no reejecutar migraciones/reparar historial ni hacer rollback destructivo automáticamente.

Referencias oficiales verificadas: https://developers.openai.com/api/docs/models/gpt-5-mini ; https://developers.openai.com/api/docs/models/gpt-transcribe ; https://developers.openai.com/api/docs/guides/structured-outputs ; https://supabase.com/docs/guides/functions/function-configuration ; https://supabase.com/docs/guides/functions/secrets ; https://docs.expo.dev/versions/v58.0.0/sdk/audio/ .

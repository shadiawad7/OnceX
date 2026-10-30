# IA para introducir partidos en ONCEX

## Encaje con la arquitectura existente

El acceso está en Equipo → Partidos → Nuevo partido → **Asistente IA · Preparar partido**. El entrenador puede dictar un audio grabado o escribir un relato. Ambos terminan en el mismo borrador en memoria y en el mismo editor existente. No hay otra tabla de partidos, otro registro de jugadores ni otro sistema de puntuación.

Se revisaron `team_matches`, `match_players`, `save_match_lineup_v2`, `confirm_match_statistics_v3`, `matchStatisticsError`, `matchEntryStepError`, `concededDuringAppearance`, las migraciones de resultado/temporada, ONCEX Points y Card/OVR. La confirmación existente sigue siendo la única escritura de estadísticas oficiales de este flujo. Conserva revisión, permisos, comprobación de plantilla, coherencia del resultado y recálculos actuales.

Flujo:

1. «Dictar partido» permite grabar hasta 120 segundos; «Escribir partido» permite introducir hasta 12.000 caracteres. No hay llamadas al abrir la pantalla ni al editar campos.
2. Al terminar la grabación, enviarla al backend autenticado con el ID del equipo: `gpt-transcribe` devuelve una transcripción y, a continuación, se ejecuta una interpretación. El relato escrito pasa directamente a interpretación. Una grabación genera como máximo una llamada de transcripción y una de interpretación, sin reintentos automáticos.
3. GPT-5 mini genera un borrador mediante Structured Outputs (`strict:true`, `additionalProperties:false`), validado tanto en servidor como en móvil.
4. Revisar rival, fecha, duración, condición, resultado y actuaciones. Corregir, añadir o eliminar entradas. Los nombres ambiguos, apodos o coincidencias fonéticas exigen selección explícita de la plantilla.
5. Confirmar expresamente las acciones no mencionadas como cero o rellenarlas. Los minutos, titulares y goles encajados nunca se rellenan por esa opción.
6. «Revisado · Pasar a alineación» lleva los datos al formulario existente. Completar los **11 titulares, al menos un portero**, y los suplentes participantes. Una mención del borrador no puede quedar fuera de la alineación silenciosamente.
7. Guardar la alineación mediante `save_match_lineup_v2` crea únicamente el borrador ya existente. Las cifras interpretadas se conservan en memoria y se vinculan a los `slot_id` devueltos por el servidor.
8. Revisar el acta y pulsar su confirmación final: `confirm_match_statistics_v3` valida y oficializa las estadísticas. El backend calcula puntos, clean sheet, evolución y Card/OVR con sus reglas vigentes.

No se promete poder confirmar un relato de solo tres jugadores: el modelo actual exige el XI completo. No se infieren titulares ni participación de quienes no fueron mencionados. El entrenador completa esos datos en el editor habitual.

## Contrato

`supabase/functions/_shared/matchDraft.ts` es el contrato único, utilizado por el móvil y el backend. Usa los nombres actuales: `opponent`, `played_on`, `duration`, `venue` (`home`/`away`/`null`), `goals_for`, `goals_against`; y `player_id`, `starter`, `minutes`, `goals`, `own_goals`, `assists`, `yellow_cards`, `red_cards`, `conceded_while_playing`.

Los goles se expresan siempre desde el equipo seleccionado, incluso de visitante. `null` representa información desconocida, también para acciones no mencionadas. Los únicos campos de transporte adicionales son la mención original, candidatos, estado/confianza de identidad, pendientes y advertencias. No se aceptan claves de puntos, OVR o clean sheet.

Incluso si el proveedor afirma tener confianza alta, el servidor solo permite identificación automática para un nombre completo o primer nombre único realmente presente en el relato. Otras coincidencias pasan a `needs_confirmation`. Los IDs de jugador y candidatos siempre deben pertenecer a la plantilla autorizada; de lo contrario se rechaza la respuesta.

El esquema verifica estructura, tipos y pertenencia; las advertencias deterministas detectan duplicados, minutos imposibles, tarjetas y discrepancias del marcador. Cuando los datos están completos, también se llama a `matchStatisticsError`. La confirmación oficial vuelve a validar en Postgres.

## Backend y privacidad

Una sola Edge Function, `ai-match-draft`, verifica el token con `auth.getUser`. Usa un cliente con el JWT del usuario, sin service-role, y llama al RPC `ai_match_context`. Este reutiliza `private.can_manage_match_team`: leer un equipo no concede permiso para preparar sus partidos.

El adaptador `supabase/functions/ai-match-draft/provider.ts` implementa `MatchAIProvider` (transcripción e interpretación). Está separado de permisos, validación y persistencia; cambiar de proveedor requiere implementar esa interfaz, no rehacer el sistema de partidos.

El RPC devuelve exclusivamente ID y nombre de los jugadores del equipo. No se consultan DNI, teléfonos, emails, direcciones, fecha de nacimiento, fotos ni historial médico. No se acepta una plantilla enviada por el cliente. Evita incluir esa información en el propio relato: se envía el relato necesario al proveedor.

La función no inserta ni confirma partidos. Su única escritura es un contador privado y atómico de solicitudes: **30 por usuario y hora**. No registra prompts ni respuestas. OpenAI Responses recibe `store:false`. Esto no sustituye las condiciones de retención del proveedor ni representa una promesa de Zero Data Retention.

La función acepta texto JSON o audio multipart de hasta 10 MB. Valida el tipo y la cabecera del audio. No hay transcripción en tiempo real. La transcripción se devuelve junto al borrador y queda visible/editable; si la interpretación falla después de transcribir, se conserva el texto para continuar manualmente. Los audios no se almacenan en Supabase; se graban en caché local y se intenta eliminarlos tras procesarlos o descartarlos. Una salida incompleta, rechazo, error de proveedor o respuesta no validable no genera estadísticas. No hay reintentos de pago automáticos. El formulario manual sigue disponible.

## Activación

Aplicar `supabase/migrations/202610300001_ai_match_drafts.sql` después de las migraciones actuales. Desplegar `ai-match-draft`, manteniendo la configuración de `supabase/config.toml`: la propia función verifica el JWT, compatible con el patrón existente del proyecto.

Configurar **solo como secretos de Supabase Edge Functions**:

- `OPENAI_API_KEY` (necesario). Introducirlo desde el panel seguro de Supabase; no añadirlo a `.env` del móvil, al repositorio ni al chat.
- `OPENAI_MATCH_MODEL` (opcional, valor inicial `gpt-5-mini`). Debe admitir Responses y Structured Outputs estrictos.
- `OPENAI_TRANSCRIPTION_MODEL` (opcional, valor inicial `gpt-transcribe`).

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los proporciona el entorno de Edge Functions. No usar `EXPO_PUBLIC_OPENAI_API_KEY`.

Ejemplo de despliegue, una vez seleccionado el proyecto correcto:

```sh
supabase db push
supabase functions deploy ai-match-draft
```

Si la CLI aún no está vinculada al proyecto, ejecutar primero `supabase login` y `supabase link --project-ref TU_PROJECT_REF`. Comprobar `supabase db push --dry-run` antes de aplicar las migraciones pendientes. No se ha desplegado esta integración en un proyecto remoto desde esta entrega.

En el panel de Supabase del proyecto, abrir **Edge Functions → Secrets → Add new secret**, crear `OPENAI_API_KEY` y pegar allí la clave del proyecto de OpenAI. Añadir opcionalmente los otros dos secrets con los valores anteriores. No hay que introducir ninguna clave en React Native.

El modelo se elige exclusivamente en la Edge Function: `OPENAI_MATCH_MODEL` o, si no se configura, `gpt-5-mini`. Cambiar este secret permite cambiar de modelo sin modificar ni publicar la app móvil. No se acepta un modelo enviado por el cliente. `expo-audio` se instaló con `npx expo install expo-audio` para Expo SDK 58. El plugin de `app.json` añade el permiso de micrófono y desactiva grabación/reproducción en segundo plano. Para una app instalada previamente, generar un nuevo development build/binario para incluir el módulo y los permisos; no basta una actualización OTA. En web, el micrófono necesita HTTPS o localhost. Si la grabación no está disponible, se puede escribir.

## Verificación

```sh
node --test tests/aiMatchDraft.cjs tests/matchValidation.cjs tests/matchEntrySteps.cjs tests/matchScoring.cjs tests/matchSeason.cjs
npx expo lint
npx tsc --noEmit
```

`tests/aiMatchDraft.cjs` ejecuta el handler con OpenAI y Supabase simulados, sin consumir API: autenticación, permisos, límite, esquema, IDs ajenos, coincidencias ambiguas, desconocidos, contradicciones, rechazos, respuestas incompletas, audio inválido, transcripción vacía, transcripción seguida de una sola interpretación, timeout, límites de OpenAI, configuración del modelo desde backend y traslado de las correcciones a los slots del editor. No demuestra precisión del modelo real.

`supabase/tests/ai_match_drafts.sql` comprueba permisos, minimización de plantilla, límite y equivalencia del resultado oficial de dos actas idénticas (manual y procedente de revisión IA) mediante los mismos RPC en una base **local desechable**, con rollback. Ejecutarlo después de todas las migraciones. Probar además, con credenciales de servidor configuradas, el ejemplo del Levante: faltan fecha, duración y XI completo; «todo el partido» no puede traducirse a minutos mientras no se conozca la duración. Comprobar también un empate 0-0, dos Pablos, un jugador ajeno, una revisión del marcador y el rechazo de minutos imposibles antes de confirmar.

## Estado de validación de esta entrega

- Se validó una copia aislada de los 16 archivos preparados para el commit, sobre el HEAD existente, excluyendo los cambios anteriores de diseño.
- `node --test tests/*.cjs`: **93 pruebas superadas**, incluidas 22 de integración IA con el proveedor simulado. No hubo llamadas de pago a OpenAI.
- Lint, TypeScript de la app, comprobación de tipos del backend con los tipos locales de Supabase y exportación web: correctos. La comprobación del backend no equivale a ejecutar la función en Deno/Supabase.
- **Pendientes:** ejecución de las pruebas SQL de `supabase/tests/`, incluida `ai_match_drafts.sql`, porque Docker no está arrancado; prueba de dictado con un dispositivo y OpenAI reales; aplicación remota de la migración y despliegue de la Edge Function.

## Primer dictado real

1. Crear los secrets indicados en el proyecto Supabase correcto y aplicar/desplegar la integración como se explica arriba. La clave de OpenAI no se introduce en ONCEX.
2. Instalar dependencias con `npm install` y arrancar con `npx expo start`. Usar Expo Go compatible con SDK 58 o un development build nuevo que incluya `expo-audio` y sus permisos. Una app compilada antes de añadir el módulo requiere un nuevo binario.
3. Entrar como entrenador del equipo y abrir **Partidos → REGISTRAR PARTIDO · ELEGIR 11 → ASISTENTE IA · PREPARAR PARTIDO**.
4. Pulsar **Dictar partido**, permitir el micrófono y usar nombres reales de esa plantilla. Por ejemplo: «Jugamos contra el Levante fuera de casa el 29 de octubre de 2026. Duró 90 minutos. Ganamos 3-1. Shadi jugó 90, marcó un gol y dio una asistencia. Pablo jugó 70 y recibió una amarilla. Ethan jugó 90 y marcó dos goles». Sustituir esos nombres si no pertenecen al equipo.
5. Pulsar **Terminar y generar borrador**. Revisar la transcripción, el marcador y todos los jugadores; resolver coincidencias y completar campos desconocidos. Editar campos no llama a OpenAI. Volver a generar tras cambiar el relato sí es una nueva petición explícita.
6. Rellenar las acciones pendientes o confirmar expresamente que las no mencionadas son cero. Pulsar **Revisado · Pasar a alineación**, completar los 11 titulares con portero y los suplentes, y guardar la alineación como borrador.
7. Completar minutos y goles encajados pendientes. Pulsar **RESULTADOS →**, revisar el acta habitual y solo entonces **CONFIRMAR Y GUARDAR PARTIDO**. Esta acción usa `confirm_match_statistics_v3`, igual que el registro manual.

Referencias oficiales consultadas: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [transcripción de archivos](https://developers.openai.com/api/docs/guides/speech-to-text), [expo-audio SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/).

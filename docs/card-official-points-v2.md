> Actualización 202610230008: modelo oncex-card-v3. IMP compara los puntos oficiales acumulados de la temporada, sin dividir por minutos ni multiplicar por porcentaje de participación. La participación continúa influyendo mediante la fiabilidad existente. EFI conserva puntos/U. El resto de atributos y pesos no cambia; el histórico anterior se conserva.

# ONCEX Card v2

Ejecutar 202610230007_card_official_points_v2.sql después de las migraciones anteriores. Preparada y probada localmente; no ejecutada en Supabase remoto. Reutiliza tablas y conserva las valoraciones/cierres anteriores. Las nuevas valoraciones llevan versión oncex-card-v2.

## Fórmulas

U = suma de minutos/duración por actuación. Con duración uniforme D, goles/U equivale a goles/minutos × D. Con duraciones distintas se usan partidos completos equivalentes.

P = minutos jugados/minutos posibles, limitada a 1.

- FIN base = goles/U.
- CRE base = asistencias/U.
- DIS base = −(amarillas + 3×rojas)/U; menos penalización implica mayor valoración.
- EFI base = puntos oficiales/U.
- IMP base = puntos oficiales/U. Para diferenciar contribución global de eficacia, la métrica de comparación IMP = base × P. Esta diferenciación es una decisión de implementación: el usuario dio fórmulas base idénticas, pero pidió resultados distintos. Con participación completa pueden coincidir.
- REG base = 100 × (0,70P + 0,30 × partidos jugados/posibles), limitado a 0–99. No se convierte en percentil. 80% minutos y 90% partidos = 83.

FIN/CRE/IMP/DIS/EFI usan percentiles de rango medio por misma posición/categoría/temporada, incluyendo todos los clubes ONCEX. Empates reciben igual valor. Con un solo jugador la referencia es neutral 50, sin rival inventado.

Fiabilidad = mínimo(1, minutos/900, partidos/10). Se conserva la política existente. Cada atributo final = redondear(50 + fiabilidad × (valor normalizado − 50)), limitado a 0–99. REG utiliza su porcentaje directo como valor normalizado. REG 83 queda en 83 con fiabilidad completa; con poca participación se aproxima a 50.

OVR = suma ponderada de los seis atributos finales con los pesos exactos DEL/MED/DEF; redondeada y limitada a 0–99. Se elimina la excepción de promediar con 99. Ejemplo DEL: FIN 88, CRE 76, IMP 91, DIS 85, REG 83, EFI 90 → 86,45 → 86.

## Datos y límites

Solo actuaciones confirmadas, con puntos oficiales guardados y fecha no futura. Se agrupa por identidad, posición, categoría y temporada. Basta una aparición con minutos positivos, sin mínimo de comparables. Las actuaciones con cero minutos aportan sus puntos/tarjetas oficiales al total, sin contar como aparición.

IMP y EFI leen los puntos oficiales: no cambian cómo se calculan los puntos del partido. Los bonus de resultado/visitante influyen en esos ratios. Más puntos no implica siempre mayor OVR si la participación u otras estadísticas difieren.

La confirmación/corrección recalcula las Cards. La RPC del perfil y Evolución selecciona v2. El refresco diario y cierre mensual existentes se conservan. No se reconstruye el pasado ni se sobrescriben meses cerrados.

Las oportunidades son partidos confirmados del equipo desde la primera aparición registrada, incluidas convocatorias con cero minutos. Sin historial completo de altas/bajas/disponibilidad, REG conserva esa limitación. No se han definido pesos de porteros.

## Verificación

card_official_points_v2.sql comprueba coherencia de 9/11 puntos con igual participación y demás estadísticas; IMP/EFI distintos con participación parcial; REG 83; lectura de v2; muestra de un jugador con OVR ponderado y ausencia de cambios en puntos. La prueba TypeScript verifica OVR 86. La regresión del bonus visitante pasa.

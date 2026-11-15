# Límites de convocatoria

El límite se refiere a jugadores inscritos en el acta, no a las licencias de plantilla ni a los cambios permitidos.

Las reglas verificadas para 2026/2027 están en `src/data/matchCallupRules.json`, con enlace al documento oficial. La migración `202611150001_match_callup_limits.sql` contiene el mismo catálogo. La prueba Node comprueba que ambos coincidan.

| Competición | Máximo |
| --- | ---: |
| Ligas territoriales masculinas F11 FFCV incluidas en el catálogo | 18 |
| Cadete e infantil territorial masculino | 18 |
| Liga Nacional Juvenil y División de Honor Juvenil, liga regular | 18 |
| Segunda y Tercera Federación masculinas | 20 |
| Primera Federación masculina | 23 |
| La Nostra Copa F11 masculina | 20 |
| Copa de Campeones Juvenil | 22 |

Fuentes principales:

- [FFCV, Circular 8, temporada 2026/27, apartado 10](https://ffcv.es/wp/wp-content/uploads/2026/08/Circular-8-Disposiciones-Generales-Futbol-v3.0-publicada.pdf).
- [FFCV, Circular 18, temporada 2026/27, disposiciones específicas](https://ffcv.es/wp/wp-content/uploads/2026/09/Circular-18-Cadetes-e-Infantiles-v3.0-publicada.pdf).
- [RFEF, Tercera Federación, Circular 87, artículo 24](https://rfef.es/sites/default/files/pdf/circulares/4._Circular_87_-_CNL_Tercera_Federacion___Anexo.pdf).
- Los restantes documentos se enlazan en cada entrada del catálogo JSON.

Se elige por temporada del partido y competición federativa guardada en el equipo. Para equipos antiguos sin vinculación se reconoce su categoría exacta del catálogo anterior. No se asigna un máximo inventado a temporadas, modalidades o competiciones no verificadas; la app lo indica. Los límites no acreditan la elegibilidad individual de los jugadores.

La interfaz bloquea altas al llegar al máximo y vuelve a comprobar la selección al guardar. El servidor utiliza triggers nuevos para las inserciones o movimientos de jugadores y la confirmación inicial de borradores. No se reescriben RPC de estadísticas, fórmulas de puntos ni registros históricos. Las correcciones de actas ya confirmadas conservan su funcionamiento.

La nueva migración requiere `202611140001_team_federation_groups.sql`. Está preparada para revisión; no se debe dar por aplicada en remoto por haber superado el ensayo local.

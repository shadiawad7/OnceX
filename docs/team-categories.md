# Categorías de equipos de la Comunidad Valenciana

El selector muestra las divisiones de fútbol once masculino de la Comunidad Valenciana, agrupadas en Cadete, Juvenil y Amateur/Sénior. Mantiene la búsqueda sin distinguir tildes. El filtro de territorio se ha retirado porque el catálogo se centra en una comunidad.

- Cadete: Autonómica, Preferente, Primera y Segunda.
- Juvenil: División de Honor y Liga Nacional (competiciones nacionales con participación valenciana), Comunitat, Primera, Segona y Tercera FFCV.
- Amateur: Comunitat, Primera, Segona y Tercera FFCV.

Los nombres del catálogo están en `src/data/teamCategories.ts`. El valor se guarda en `teams.category` con el territorio. No necesita migración SQL. Las categorías históricas de equipos existentes no se borran ni cambian automáticamente; se pueden sustituir eligiendo una opción del nuevo catálogo.

Alcance: divisiones, sin separar sus grupos provinciales. Fútbol sala y competiciones Valenta no están incluidos en este catálogo.

Fuentes oficiales FFCV consultadas para la temporada 2026/27:

- [Bases de competiciones cadetes e infantiles](https://ffcv.es/wp/blog/2026/09/circular-no-18-normas-reguladoras-y-bases-de-competiciones-cadetes-e-infantiles/).
- [Bases de competiciones juveniles](https://ffcv.es/wp/blog/2026/08/circular-no-12-normas-reguladoras-y-bases-de-competiciones-juveniles/).
- [Inicio de competiciones](https://ffcv.es/wp/blog/tag/inicio-competiciones/).

También se contrastó la estructura de divisiones con las circulares de 2025/26 de cadetes y juveniles, que incluyen previsiones de 2026/27. El catálogo requiere revisión al cambiar de temporada.

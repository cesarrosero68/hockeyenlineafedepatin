# CHECKPOINT — Fedepatin / Copa Nacional
**Fecha:** 3 de agosto de 2026
**Tag de GitHub:** `checkpoint-2026-08-03-pre-carga`

Este es el punto de referencia "ANTES" de empezar a cargar jugadores
y cuerpo técnico de Copa 2026-II. Si algo sale mal durante la carga,
este documento describe exactamente a qué estado volver.

---

## ANTES (estado a esta fecha)

### Base de datos
- `players`: 329 jugadores, TODOS pertenecientes a Copa 2026 (edición
  anterior). `tournament_id` ya no es obligatorio pero ningún jugador
  de 2026-II ha sido cargado todavía.
- `rosters`: 324 filas, todas de Copa 2026. Los 37 rosters de
  AVS-Rabbits que estaban huérfanos (sin `tournament_id`) ya se
  repararon.
- `team_staff`: tabla recién creada, VACÍA (o con un registro de
  prueba "PRUEBA ENTRENADOR" si se insertó para probar la UI —
  bórralo antes de cargar datos reales).
- `teams` de Copa 2026-II: 39 equipos ya creados, sin jugadores ni
  staff asignado.
- 114 de los 329 jugadores de Copa 2026 tienen `velopro_number`
  cargado (cruce de planillas de julio/agosto).

### Código (GitHub — cesarrosero68)
- `AdminPlayers.tsx`: filtra por rosters de la edición activa
  (migración a jugadores globales), incluye pestaña "Cuerpo Técnico".
- `AdminUpload.tsx`: reutiliza jugadores existentes por VeloPro o
  nombre+fecha de nacimiento; detecta filas de ENTRENADOR/ASISTENTE/
  DELEGADO y las manda a `team_staff`.
- `AdminHome.tsx`: dashboard sigue la edición que se está viendo
  (antes solo mostraba la activa).
- `AdminExport.tsx`: exporta VeloPro en la columna Documento.
- `Teams.tsx`: muestra bloque de Cuerpo Técnico en la vista pública
  cuando el equipo tiene staff cargado. **Pendiente:** quitar las
  filas falsas "Sin registro" que aparecen cuando un equipo no tiene
  roster (ver sección PENDIENTES).

### Archivos de carga preparados (no cargados aún / en proceso)
- `PLANILLAS_COPA_2026-II.xlsx` — 156 jugadores extraídos de las
  planillas de clubes (Condors, VRaptors, Rinos, Wild Dogs, Dragones,
  Graco). 35 filas marcadas en amarillo por ambigüedad en separación
  nombre/apellido. 49 sin VeloPro, 26 sin fecha de nacimiento.
- `cuerpo_tecnico_2026-II.xlsx` / `.csv` — 44 personas de cuerpo
  técnico, reconstruido y corregido usando el listado del semestre
  pasado como referencia. 5 personas nuevas sin precedente en el
  listado maestro (Vicmar Azuaje, Carlos Darío Morales, Nicolás
  Urrego, Joseph Páez, Nelly Rigueros Q.) — verificar ortografía.

---

## DESPUÉS (a completar según avance la carga)

> Actualizar esta sección conforme se ejecuten los cargues.

- [ ] CSV de cuerpo técnico cargado — resumen mostrado: ______
- [ ] CSV de jugadores por equipo cargado (uno por uno):
  - [ ] Condors
  - [ ] VRaptors
  - [ ] Rinos Na-Palm
  - [ ] Wild Dogs
  - [ ] Dragones
  - [ ] Graco
- [ ] Verificado: cuántos jugadores se reutilizaron vs. se crearon
  nuevos en total: ______
- [ ] Verificado en la web pública que los equipos muestran jugadores
  y cuerpo técnico correctamente.

---

## CÓMO VOLVER A "ANTES" SI ALGO SALE MAL

**Código:** en GitHub, comparar contra el tag
`checkpoint-2026-08-03-pre-carga`, o revertir archivos puntuales
desde ahí.

**Datos (si se necesita deshacer una carga de jugadores/staff):**

```sql
-- Solo si se guardó el snapshot manual del mismo día:
-- Ver qué jugadores/rosters/staff se crearon DESPUÉS del checkpoint
SELECT * FROM players
WHERE id NOT IN (SELECT id FROM backup_20260803_players);

SELECT * FROM rosters
WHERE id NOT IN (SELECT id FROM backup_20260803_rosters);

SELECT * FROM team_staff
WHERE id NOT IN (SELECT id FROM backup_20260803_team_staff);
```

Revisa esas filas antes de borrar nada — puede que solo una parte
esté mal, no toda la carga.

**Restauración completa (última opción):** Supabase → Database →
Backups → restaurar snapshot de esta fecha. Esto revierte TODA la
base, incluidas otras ediciones — usar solo si el daño es grave.

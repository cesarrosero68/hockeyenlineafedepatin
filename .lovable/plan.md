

# Plan: Admin Modules Completos + Flujo de Partido en Vivo

## Diagnostico

### Problema raiz
1. **Divisiones, Clubes, Equipos, Jugadores, Auditoria**: No existen los archivos de pagina ni las rutas en `App.tsx`. Solo hay `AdminHome.tsx` y `AdminMatches.tsx` en `src/pages/admin/`. El `AdminDashboard.tsx` tiene los links en la nav pero al hacer click se muestra 404.
2. **Hora de Bogota en partidos**: La funcion `bogotaInputToUTC` en `src/lib/timezone.ts` tiene un bug de doble conversion (lineas 35-41). Calcula el offset dos veces.
3. **Iniciar partido**: Actualmente el boton "Iniciar" solo cambia el status a `in_progress`. No abre ningun menu para registrar goles ni sanciones.
4. **RLS restrictivas**: Todas las policies publicas siguen marcadas como `RESTRICTIVE` (no `PERMISSIVE`), lo que puede bloquear lecturas. Se necesita una migracion para corregirlas.

---

## Archivos nuevos a crear (6)

### 1. `src/pages/admin/AdminDivisions.tsx`
- CRUD de divisiones: tabla con nombre, logo_url
- Formulario inline para crear/editar division
- Consulta `supabase.from("divisions").select("*")`
- Mutaciones INSERT/UPDATE/DELETE

### 2. `src/pages/admin/AdminClubs.tsx`
- CRUD de clubes: tabla con nombre, logo_url
- Formulario inline para crear/editar club
- Consulta `supabase.from("clubs").select("*")`

### 3. `src/pages/admin/AdminTeams.tsx`
- CRUD de equipos: nombre, club_id (dropdown de clubs), category_id (dropdown de categorias), logo_url
- Consultas con joins a clubs y categories
- Formulario con selects para club y categoria

### 4. `src/pages/admin/AdminPlayers.tsx`
- CRUD de jugadores: first_name, last_name, jersey_number, date_of_birth
- Gestion de rosters: asignar jugador a equipo con posicion y numero
- Consulta `supabase.from("players")` y `supabase.from("rosters")`

### 5. `src/pages/admin/AdminAudit.tsx`
- Vista de solo lectura de `audit_logs`
- Tabla con columnas: fecha, usuario, tabla, accion, datos anteriores/nuevos
- Filtros por tabla y accion

### 6. `src/pages/admin/MatchLivePanel.tsx`
- Panel que se abre al hacer click en "Iniciar" un partido (o al abrir un partido `in_progress`)
- Dos secciones con tabs: **Goles** y **Sanciones**

**Seccion Goles:**
- Dropdown equipo (local/visitante)
- Dropdown jugador goleador (filtrado por roster del equipo seleccionado)
- Dropdown jugador asistencia (mismo roster + opcion "N/A")
- Input tiempo de juego mm:ss
- Dropdown periodo: 1T / 2T / OT
- Boton agregar gol → INSERT en `goal_events`
- Lista de goles registrados con opcion de eliminar

**Seccion Sanciones:**
- Dropdown equipo
- Dropdown jugador (roster del equipo)
- Dropdown tipo sancion (33 codigos exactos):
  BC: BODY CHECKING, BDG: BOARDING, BE: BUTT ENDING, BP: BENCH PENALTY, BS: BROKEN STICK, CC: CROSS CHECKING, CFB: CC FROM BEHIND, CH: CHARGING, DG: DELAY OF GAME, ELB: ELBOWING, FI: FIGHTING, FOP: FALLING ON PUCK, FOV: FACE OFF VIOL., GE: GAME EJECTION, GM: GAME MISSCONDUCT, HKG: HOOKING, HO: HOLDING, HP: HAND PASS, HS: HIGH STICK, IE: ILLEGAL EQUIPMENT, INT: INTERFERENCE, INTG: INT. OF GOALTENDER, KNE: KNEEING, MP: MATCH PENALTY, MSC: MISSCONDUCT, OA: OFFICIAL ABUSE, PS: PENALTY SHOOT, RO: ROUGHING, SL: SLASHING, SP: SPEARING, TMM: TOO MANY MEN, TR: TRIPPING, USC: UNSPORTSMANLIKE
- Dropdown tiempo sancion predeterminado: 1:30, 4:00, 10:00 + opcion "Manual" con input
- Dropdown periodo: 1T / 2T / OT
- Boton agregar sancion → INSERT en `penalties`
- Lista de sanciones registradas con opcion de eliminar

---

## Archivos a modificar (3)

### 7. `src/App.tsx`
- Agregar lazy imports para los 6 nuevos componentes
- Agregar rutas hijas dentro de `<Route path="/admin">`:
  - `divisions` → AdminDivisions
  - `clubs` → AdminClubs
  - `teams` → AdminTeams
  - `players` → AdminPlayers
  - `matches` → AdminMatches (ya existe)
  - `audit` → AdminAudit

### 8. `src/lib/timezone.ts`
- Corregir `bogotaInputToUTC`: eliminar la logica duplicada. El input datetime-local debe tratarse como hora Bogota (UTC-5), simplemente concatenar `"-05:00"` al string y crear Date.

### 9. `src/pages/admin/AdminMatches.tsx`
- Cambiar el boton "Iniciar" para que ademas de cambiar status, abra/navegue al `MatchLivePanel`
- Para partidos `in_progress`, mostrar un boton "Gestionar" que abre el panel de eventos en vivo
- El marcador (score_regular) se actualizara automaticamente al contar goles registrados

---

## Migracion de base de datos

### Migracion: Corregir RLS policies a PERMISSIVE
Todas las policies `Public read X` y `Admin manage X` estan como RESTRICTIVE. Se necesita recrearlas como PERMISSIVE para que funcionen correctamente. Esto afecta todas las tablas: divisions, categories, clubs, teams, matches, match_teams, goal_events, penalties, standings_aggregate, fair_play_aggregate, brackets, playoff_bracket, playoff_slots, rosters, match_import, audit_logs, user_roles.

---

## Detalles tecnicos

### Estructura de datos para el panel en vivo
- Rosters se consultan via: `supabase.from("rosters").select("id, jersey_number, position, team_id, player:players!rosters_player_id_fkey(id, first_name, last_name)").in("team_id", [homeTeamId, awayTeamId])`
- Nota: `players` tiene RLS restrictiva para admin/editor, lo cual esta bien ya que el panel solo lo usan admins autenticados
- Al agregar un gol se hace INSERT en `goal_events` y UPDATE del `score_regular` en `match_teams`
- Al agregar una sancion se hace INSERT en `penalties` con `penalty_minutes` convertido de string "1:30" → entero minutos (se guardara como el valor en minutos enteros mas cercano o como texto segun la columna, que es integer, asi que 1:30 = 2 min, 4:00 = 4 min, 10:00 = 10 min)

### Correccion timezone
```typescript
export function bogotaInputToUTC(localValue: string): string {
  if (!localValue) return "";
  return new Date(localValue + ":00-05:00").toISOString();
}
```

### Flujo de "Iniciar partido"
1. Click "Iniciar" → cambia status a `in_progress` → navega a `/admin/matches?live=MATCH_ID` o abre dialog
2. El MatchLivePanel se muestra como un Dialog grande (Sheet) con toda la interfaz de registro
3. Al cerrar el panel, se vuelve a la lista de partidos


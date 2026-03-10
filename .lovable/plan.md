

# Auditoría Completa y Plan de Corrección

## Hallazgos de la Auditoría

### 1. Consultas duplicadas entre páginas
- `"divisions"` query key se usa en **Index, Teams, FairPlay, Standings** — todas con la misma consulta pero algunas sin `staleTime`. El staleTime global de 2min cubre esto, pero la falta de consistencia causa confusión.
- `"categories"` query key duplicado en **Teams, FairPlay, Standings, Index** — misma situación.
- `"admin-teams"` en **CreateMatchDialog** y **EditMatchDialog** — comparten query key correctamente (bien).
- `"admin-teams-list"` en **AdminPlayers** es diferente de `"admin-teams"` — consultas similares con keys distintos.

### 2. Teams page carga TODO innecesariamente
- `Teams.tsx` ejecuta 5 queries paralelas: divisions, categories, all-teams, all-rosters, players-public. La query `"all-rosters"` carga **todos** los rosters del torneo de golpe, sin filtrar. Esto es pesado.

### 3. MatchLivePanel — el problema real del congelamiento
El bug principal: cuando el panel está abierto y el admin cambia de pestaña, el `visibilitychange` handler en línea 97-110 usa `refetchMatch`, `refetchGoals`, `refetchPenalties`, `refetchRosters` que son funciones de `useQuery`. **Pero estas funciones se capturan en el closure del useEffect sin estar en las dependencias**, así que pueden quedar stale. Además:

- El `useEffect` de visibility (línea 97) tiene `[open, matchId]` como deps, pero referencia `refetchMatch`, `refetchGoals`, etc. que no están incluidas. Esto significa que las funciones de refetch capturadas pueden apuntar a queries obsoletas.
- Las mutaciones (`addGoalMutation`, `addPenaltyMutation`) usan `isPending` para deshabilitar botones. Si una mutación falla silenciosamente por timeout de red mientras el tab está en background, `isPending` puede quedar en `true` indefinidamente.

### 4. Realtime — recreación excesiva del canal
`use-realtime.ts` línea 79-83: cada vez que el tab vuelve a ser visible, `createChannel()` destruye y recrea el canal completo. Esto es innecesariamente agresivo. El canal de Supabase tiene reconexión automática integrada. Recrear el canal en cada tab focus causa un pico de suscripción que puede generar latencia.

### 5. Realtime invalida queries del live panel innecesariamente
`TABLE_QUERY_KEYS` mapea `match_teams` a `"live-match-detail"`, y `goal_events` a `"live-match-detail"`. Esto causa que cada gol registrado invalide el match detail dos veces (una por goal_events y otra por la actualización de match_teams scores). La invalidación del realtime compite con el `refetchGoals()/refetchMatch()` explícito del `onSuccess` de la mutación.

### 6. Queries sin staleTime explícito
Varias queries en FairPlay, Standings, MatchDetail, AdminPlayers, AdminDivisions no tienen `staleTime`, así que usan el global de 2min. Esto está bien pero podría ser más agresivo para datos estáticos.

### 7. Stats page — dos queries encadenadas
`Stats.tsx` hace primera query a `player_stats_view`, luego una segunda query a `players_public` usando los IDs obtenidos. La segunda query tiene `playerIds` como parte del queryKey, pero `playerIds` se recalcula en cada render porque es resultado de `.map().filter()`. Debería ser memoizado.

### 8. Estadísticas ya están optimizadas en backend
Los triggers `trg_match_status_change`, `trg_goal_event_changed`, `trg_penalty_changed` ya manejan el recálculo. **No hay recálculos en el frontend**. Esto está bien.

### 9. Índices ya están en su lugar
14+ índices cubren las columnas críticas. No se necesitan más.

---

## Plan de Correcciones

### Corrección 1: Fix del MatchLivePanel — Causa raíz del congelamiento
**Archivo:** `src/pages/admin/MatchLivePanel.tsx`

- Reemplazar el `useEffect` de visibilitychange (líneas 97-110) usando refs para las funciones de refetch, o usar `useCallback` y incluir las funciones en las dependencias del efecto.
- Simplificar: usar un solo `useEffect` que llame `queryClient.refetchQueries` con los queryKeys específicos en vez de funciones individuales de refetch. Esto es más robusto porque no depende de closures.
- Agregar protección de timeout a las mutaciones: si `isPending` lleva más de 15 segundos, resetear el estado de la mutación con `mutation.reset()`.
- Remover `refetchOnWindowFocus: true` de las queries individuales (ya que el handler manual lo cubre) para evitar doble refetch.

### Corrección 2: Simplificar realtime — no recrear canal en cada tab focus
**Archivo:** `src/hooks/use-realtime.ts`

- En vez de destruir y recrear el canal al volver al tab, simplemente invalidar las queries pendientes. El canal de Supabase se reconecta automáticamente.
- Solo recrear el canal si realmente entró en estado de error (`CHANNEL_ERROR` o `TIMED_OUT`), no en cada visibility change.
- Remover el handler `handleOnline` que también recreaba el canal innecesariamente.

### Corrección 3: Eliminar invalidación duplicada del realtime en live panel
**Archivo:** `src/hooks/use-realtime.ts`

- Remover `"live-match-detail"` de los mappings de `match_teams` y `goal_events` en `TABLE_QUERY_KEYS`. El live panel ya maneja su propio refetch.
- Esto evita que el sistema realtime compita con las mutaciones del panel.

### Corrección 4: Memoizar playerIds en Stats
**Archivo:** `src/pages/Stats.tsx`

- Envolver `playerIds` en `useMemo` para evitar que la segunda query se ejecute innecesariamente en cada render.

### Corrección 5: Optimizar Teams page — lazy load de rosters
**Archivo:** `src/pages/Teams.tsx`

- Cambiar la query de `"all-rosters"` para que solo se ejecute cuando un equipo está expandido, filtrando por `team_id`.
- Mover la query de rosters al componente `TeamCard` individual, con `enabled: expanded`.

### Corrección 6: Agregar staleTime a queries de datos estáticos
**Archivos:** `src/pages/FairPlay.tsx`, `src/pages/Standings.tsx`, `src/pages/Teams.tsx`, `src/pages/MatchDetail.tsx`

- Agregar `staleTime: 5 * 60_000` a queries de divisions y categories que no lo tienen.
- Agregar `staleTime: 2 * 60_000` a queries de standings, fair-play, y match detail.

### Corrección 7: Consolidar query key de admin-teams
**Archivo:** `src/pages/admin/AdminPlayers.tsx`

- Cambiar `"admin-teams-list"` a `"admin-teams"` para compartir caché con CreateMatchDialog y EditMatchDialog.

---

## Archivos a editar
1. `src/pages/admin/MatchLivePanel.tsx` — Fix principal del congelamiento
2. `src/hooks/use-realtime.ts` — Simplificar reconexión
3. `src/pages/Stats.tsx` — Memoizar playerIds
4. `src/pages/Teams.tsx` — Lazy load rosters por equipo
5. `src/pages/FairPlay.tsx` — staleTime
6. `src/pages/Standings.tsx` — staleTime
7. `src/pages/MatchDetail.tsx` — staleTime
8. `src/pages/admin/AdminPlayers.tsx` — Consolidar query key

## Sin cambios de base de datos necesarios


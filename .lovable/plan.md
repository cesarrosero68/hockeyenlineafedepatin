

# Plan de Corrección Quirúrgica

## Diagnóstico Final

Después de auditar todo el código actual, los problemas restantes son:

1. **Thundering herd al volver a la pestaña**: El `visibilitychange` de `MatchLivePanel` dispara 4 refetches simultáneos + `AuthContext` dispara `getSession()`. Si el token expiró, los refetches pueden fallar antes de que la sesión se revalide. Esto deja datos stale y la UI desincronizada.

2. **Queries sin `staleTime`** en varias páginas provocan refetches innecesarios cada vez que el componente se monta o la pestaña vuelve a foco.

3. **Mutaciones sin manejo de error de red**: Si una mutación falla por timeout de red (no por error de Supabase), el `onError` muestra un toast pero el formulario no se resetea limpiamente.

4. **Stats placeholder recalculado en cada render** (menor).

## Correcciones

### 1. MatchLivePanel — Demorar refetch hasta que la sesión se revalide
**Archivo:** `src/pages/admin/MatchLivePanel.tsx`

- En el `useEffect` de visibility (línea 92-104), agregar un `setTimeout` de 500ms antes de disparar los refetches. Esto da tiempo a que `AuthContext` revalide el token primero.
- Agregar `retry: 2` a las queries del panel para tolerar fallos transitorios de red.
- Agregar `networkMode: 'online'` a las mutaciones para evitar que se ejecuten offline.

### 2. Agregar staleTime a queries que no lo tienen
**Archivos:**
- `src/pages/Schedule.tsx` — `schedule-matches`: agregar `staleTime: 60_000`
- `src/pages/MatchDetail.tsx` — `match-goals`, `match-penalties`, `match-rosters`: agregar `staleTime: 30_000`
- `src/pages/Stats.tsx` — `player-stats`, `stat-players`: agregar `staleTime: 2 * 60_000`
- `src/pages/admin/AdminHome.tsx` — `admin-counts`: agregar `staleTime: 60_000`
- `src/pages/admin/AdminPlayers.tsx` — `admin-players`, `admin-rosters`: agregar `staleTime: 30_000`
- `src/pages/admin/AdminDivisions.tsx` — `admin-divisions-crud`: agregar `staleTime: 30_000`

### 3. AuthContext — Evitar revalidación redundante
**Archivo:** `src/contexts/AuthContext.tsx`

- El `onAuthStateChange` ya maneja cambios de sesión automáticamente. El handler de `visibilitychange` que llama `getSession()` puede causar doble actualización del estado. Cambiar para que solo llame `getSession` si han pasado más de 30 segundos desde la última revalidación, usando un ref de timestamp.

### 4. Stats — Memoizar placeholder
**Archivo:** `src/pages/Stats.tsx`

- Mover `generatePlaceholderStats(15)` dentro de un `useMemo` para evitar recálculos en cada render.

## Archivos a editar
1. `src/pages/admin/MatchLivePanel.tsx`
2. `src/pages/Schedule.tsx`
3. `src/pages/MatchDetail.tsx`
4. `src/pages/Stats.tsx`
5. `src/pages/admin/AdminHome.tsx`
6. `src/pages/admin/AdminPlayers.tsx`
7. `src/pages/admin/AdminDivisions.tsx`
8. `src/contexts/AuthContext.tsx`

## Sin cambios de base de datos necesarios


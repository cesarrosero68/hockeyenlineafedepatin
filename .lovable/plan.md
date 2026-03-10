

# Diagnóstico y Corrección: Spinner Infinito y Admin No Carga

## Problema Identificado

Confirmado con el browser tool: **las queries de Supabase no están enviando requests HTTP**. La página Index renderiza pero `isLoadingDivisions` queda en `true` indefinidamente (spinner infinito). Las imágenes de división no se muestran porque la query nunca resuelve, no porque las URLs estén rotas (las URLs son correctas: `/logos/copa-futuras-estrellas.png`, `/logos/copa-nacional.png`).

Para el Admin: si `AuthContext.loading` se queda en `true` (porque `getSession()` o `fetchRole()` nunca resuelve), el componente `AdminDashboard` muestra el spinner infinito.

## Causa Raíz Probable

El `useRealtimeUpdates()` hook se ejecuta en `RealtimeProvider` que envuelve todo el app. Al llamar `supabase.channel("tournament_update").subscribe()`, esto puede interferir con la inicialización del cliente REST si hay problemas de red transitorios. Además, `AuthContext` no tiene protección de timeout: si `getSession()` o `fetchRole()` se cuelgan, `loading` queda en `true` para siempre.

## Correcciones

### 1. AuthContext — Timeout de protección para loading
**Archivo:** `src/contexts/AuthContext.tsx`

Agregar un timeout de seguridad de 5 segundos. Si `loading` sigue en `true` después de 5s, forzar `loading = false`. Esto evita que el admin (y cualquier componente que dependa de `loading`) se quede bloqueado.

También agregar try/catch a `fetchRole` para que si falla, `setLoading(false)` siempre se ejecute.

### 2. Index — Agregar retry y gcTime a la query de divisions
**Archivo:** `src/pages/Index.tsx`

Agregar `retry: 3` y `retryDelay: 1000` a la query de divisions para reintentar si falla. También agregar `gcTime` para controlar cuánto tiempo se mantiene en caché.

### 3. Mover RealtimeProvider dentro de BrowserRouter
**Archivo:** `src/App.tsx`

Mover `RealtimeProvider` para que se monte DESPUÉS de que la ruta se resuelva, evitando que la suscripción WebSocket interfiera con la carga inicial de la página. También agregar un `retry: 2` al `defaultOptions` global del QueryClient.

## Archivos a editar
1. `src/contexts/AuthContext.tsx` — Timeout de seguridad + try/catch en fetchRole
2. `src/pages/Index.tsx` — retry en query de divisions
3. `src/App.tsx` — Mover RealtimeProvider, agregar retry global


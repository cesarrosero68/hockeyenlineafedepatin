
## Diagnóstico

Lo que veo en el código actual es que la corrección previa quedó incompleta para el caso real que describes:

- `MatchLivePanel` solo invalida queries al volver a la pestaña, pero **no garantiza refetch inmediato ni recuperación completa** de datos críticos.
- `use-realtime.ts` recrea el canal en `visibilitychange`, pero **no controla estados reales del websocket** (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`), así que puede quedar “muerto” después de volver al navegador.
- Los botones de **Registrar Gol** y **Registrar Sanción** dependen de `isPending` de mutaciones. Si una petición queda colgada al cambiar de pestaña, el botón puede **quedar bloqueado indefinidamente**.
- No hay una capa de recuperación de sesión/auth al volver a foco. Si el token o el estado auth queda desfasado, el panel puede seguir visible pero no operativo.

## Plan de corrección

### 1. Endurecer la reconexión realtime
**Archivo:** `src/hooks/use-realtime.ts`

- Mantener el canal actual, pero agregar manejo explícito de estado de suscripción.
- Reconectar automáticamente cuando el canal entre en error, timeout o cierre.
- Reintentar también cuando el navegador vuelva a estar visible o recupere conectividad (`online`).
- Evitar recreaciones duplicadas del canal y limpiar correctamente listeners/canales anteriores.

### 2. Recuperar sesión al volver a la pestaña
**Archivo:** `src/contexts/AuthContext.tsx`

- Al volver a foco o recuperar red, revalidar la sesión activa con el cliente de auth.
- Si la sesión sigue viva, refrescar el estado local sin obligar al usuario a recargar.
- Mantener el rol cargado, pero sin bloquear la interfaz mientras se rehidrata el estado.

### 3. Hacer el panel vivo tolerante a cambio de pestaña
**Archivo:** `src/pages/admin/MatchLivePanel.tsx`

- Cambiar la estrategia de “solo invalidar” por **refetch explícito** de:
  - `live-match-detail`
  - `live-match-rosters`
  - `match-goals`
  - `match-penalties`
- Activar `refetchOnReconnect` y `refetchOnWindowFocus` **solo en las queries del panel vivo**.
- Agregar un fallback liviano de sincronización mientras el panel esté abierto y el partido esté `in_progress`, para que el panel no dependa únicamente del websocket.
- Desacoplar la habilitación de botones de estados transitorios de reconexión.
- Proteger las mutaciones con recuperación de error/timeout para que nunca queden “pendientes” para siempre.

### 4. Mantener la app rápida
**Archivo:** `src/App.tsx`

- No cambiar la arquitectura global.
- Dejar la configuración general liviana, y concentrar la recuperación solo en el panel admin en vivo, para no degradar el resto del sistema.

## Resultado esperado

Después de esto, el panel admin debería:

- seguir funcionando si el usuario cambia de pestaña o ventana,
- recuperar websocket y sesión automáticamente,
- volver con datos frescos del partido,
- permitir registrar goles y sanciones sin refrescar,
- evitar que los botones queden bloqueados por estados colgados.

## Archivos a intervenir

- `src/hooks/use-realtime.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/admin/MatchLivePanel.tsx`
- `src/App.tsx`

## Validación final

Voy a validar específicamente este flujo:

1. abrir panel de gestión de un partido activo,
2. registrar un gol,
3. cambiar de pestaña 15–30 segundos,
4. volver al navegador,
5. registrar otro gol sin refrescar,
6. repetir el mismo flujo con sanciones,
7. confirmar que botones, sesión y conexión siguen estables.

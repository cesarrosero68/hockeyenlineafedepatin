
# 🏒 Sistema Completo de Gestión — Torneo de Hockey en Línea

## Resumen Ejecutivo

Aplicación web full-stack para gestionar dos divisiones de hockey en línea con panel administrativo completo, dashboard público optimizado, motor de estadísticas basado en eventos y arquitectura escalable lista para producción.

---

## Fase 1 — Modelo de Datos y Base de Datos (Lovable Cloud)

Crear todas las tablas normalizadas con integridad referencial estricta:

- **divisions** — Copa Futuras Estrellas / Copa Nacional Hockey en Línea con logos precargados
- **categories** — Sub-8, Sub-10, Sub-12, Sub-14, Sub-16 Mixto, Juvenil con configuración de formato (rondas RR + tipo playoff)
- **clubs** — con campo logo_url editable
- **teams** — con logo_url, vinculado a club y categoría
- **players** — datos personales + número de dorsal
- **rosters** — relación jugador ↔ equipo por temporada
- **matches** — incluyendo fase (regular/playoff), estado (programado/en curso/cerrado/bloqueado), marcador tiempo regular separado del resultado final, campo OT/SO flag
- **match_teams** — relación equipo ↔ partido con marcador individual
- **goal_events** — goles con scorer, asistente, período, tiempo mm:ss, flag si fue en OT/SO
- **penalties** — código oficial, minutos, período, tiempo, jugador
- **standings_aggregate** — tabla snapshot materializada: PJ, W, E, L, GF, GC, DG, Pts
- **player_stats_aggregate** — G, A, Pts por jugador/categoría
- **fair_play_aggregate** — minutos de penalización por equipo/categoría/club
- **brackets** — estructura de playoffs con placement, cruces y resultados
- **user_roles** — tabla separada de roles (admin / editor) sin mezclar con perfiles
- **audit_logs** — trazabilidad completa de cambios

---

## Fase 2 — Motor de Reglas y Lógica de Negocio

### Sistema de Puntos
- Victoria = 3 pts / Empate = 1 pt / Derrota = 0 pts / Forfeit = −3 pts
- Calculado automáticamente desde eventos, nunca ingresado manual

### Algoritmo de Desempates Automático
Implementación del algoritmo oficial en cascada:
1. Mayor puntos acumulados
2. Resultado del partido directo entre empatados
3. Diferencia de goles en partidos directos
4. Menos goles en contra (general)
5. Más goles a favor (general)
- Para 3+ empatados: subgrupo recursivo aplicando mismos criterios

### Manejo de OT y Penales
- Resultado tiempo regular siempre preservado en DB
- Marcador público muestra tiempo regular + etiqueta "Gana X en OT" o "Gana X en Penales (SO)"
- Gol de OT no se suma al marcador oficial
- Fase regular: empates permitidos, sin OT
- Playoffs: OT muerte súbita → penales 3 tiradores → muerte súbita

### Recálculo Automático al Cerrar Partido
Al cambiar estado a "cerrado", trigger automático que refresca:
- standings_aggregate de la categoría
- player_stats_aggregate de los jugadores participantes
- fair_play_aggregate de los equipos
- Posiciones de bracket si aplica

---

## Fase 3 — Panel Administrativo

### Autenticación y Roles
- Login seguro con Lovable Cloud Auth
- Rol **Admin**: acceso total incluyendo desbloquear partidos, gestionar usuarios, editar calendario
- Rol **Editor**: carga de partidos, eventos de gol y penalizaciones

### Flujo Obligatorio de Carga de Partido
1. **Programar** — fecha, hora (UTC-5 Bogotá almacenado UTC), sede, equipos
2. **Registrar marcador** — tiempo regular de cada equipo
3. **Ingresar GoalEvents** — goleador, asistente, período, tiempo, tipo (regular/OT/SO)
4. **Registrar Penalizaciones** — lista desplegable con 33 códigos oficiales (sigla + descripción completa visible)
5. **Validar consistencia** — botón que verifica suma de eventos = marcador; bloquea cierre si hay error
6. **Cerrar partido** — dispara recálculo automático
7. **Bloquear** (opcional) — solo Admin puede modificar después

### Gestión Completa
- CRUD de divisiones, categorías, clubes, equipos, jugadores, roster
- Editor de calendario con drag-and-drop o formulario
- Edición de logos desde interfaz (campo logo_url)
- AuditLog visible para Admin: quién modificó qué y cuándo
- Herramienta para generación automática del calendario round-robin base

---

## Fase 4 — Dashboard Público

### Home
- Próximos partidos (máx. 5) y últimos resultados (máx. 5) con marcadores correctos
- Tabla de posiciones resumida por división
- Top 10 goleadores / asistentes / puntos (calculados desde events, nunca manuales)
- Logos de divisiones precargados

### Programación y Resultados
- Vista de calendario con filtros: división, categoría, equipo, fecha, fase (regular/playoff)
- Marcador con etiqueta OT/SO cuando aplica

### Tabla de Posiciones
- Por categoría con todas las métricas: PJ, W, E, L, GF, GC, DG, Pts
- Criterios de desempate explicados en tooltip/modal

### Página de Partido
- Marcador oficial (tiempo regular) con etiqueta clara de OT o SO
- Timeline de goles con período, tiempo, goleador, asistente
- Marcador de penales opcional
- Lista de penalizaciones del partido

### Página de Equipo
- Roster completo con dorsales
- Resultados (W/E/L) y próximos partidos
- Estadísticas de equipo

### Página de Jugador
- Goles, asistencias, puntos por categoría
- Minutos de penalización
- Historial de partidos jugados

### Bracket de Playoffs
- Visualización interactiva con cruces actualizados en tiempo real
- Placement completo (1°, 2°, 3°, 4°...) según resultados

### Fair Play
- Tabla por división / categoría / equipo: ranking por MENOS minutos de penalización
- Ranking club global con fórmula de promedio ponderado explicada en UI

---

## Fase 5 — Carga de Datos Iniciales

- Ingesta de los datos proporcionados (equipos, clubes, jugadores ya conocidos)
- Generación del calendario base con round-robin correcto por número de rondas configuradas por categoría:
  - Sub-8: 3 rondas / Sub-10: 2 rondas / Sub-12: 3 rondas
  - Sub-14: 2 rondas / Sub-16: 1 ronda / Juvenil: 2 rondas
- Estructura de playoffs vacía lista para enlazarse con resultados de fase regular

---

## Fase 6 — Optimización y Performance

- Las tablas _aggregate actúan como materialized views: el dashboard público NUNCA recalcula en cada request
- Caché de standings por categoría actualizado solo al cerrar partidos
- Queries indexados en match_id, team_id, player_id, category_id

---

## Integraciones (Fase 2 — Post-lanzamiento)

- Webhook POST automático a n8n al cerrar/bloquear partido con payload JSON completo
- Mirror a Google Sheets via n8n workflow
- Zona horaria: almacenamiento UTC, visualización UTC-5 Bogotá en toda la UI

---

## Entregables Incluidos

- ✅ Aplicación completa funcional en Lovable Cloud
- ✅ Panel admin con roles seguros y audit log
- ✅ Dashboard público optimizado sin recálculo en tiempo real
- ✅ Motor de desempates automático
- ✅ 33 códigos de penalización oficiales implementados
- ✅ Visualización correcta de OT/SO sin alterar marcador
- ✅ Bracket interactivo de playoffs
- ✅ Tabla de Fair Play con fórmula visible
- ✅ Guía de uso integrada en el admin (cómo cargar partido, cerrar, editar logos, editar calendario)

---

## Implementación por Etapas

Dado que el torneo **ya comenzó**, la implementación priorizará:

1. **Base de datos completa** con todas las tablas y relaciones
2. **Panel admin funcional** para empezar a cargar datos históricos inmediatamente
3. **Dashboard público** con toda la visualización
4. **Motor de estadísticas** y desempates
5. **Carga de datos iniciales** con los equipos/jugadores que proporcionarás

**Nota importante**: Por la magnitud del sistema (15+ tablas, múltiples servicios, lógica de negocio compleja, dos vistas separadas), lo construiremos en etapas iterativas. La primera implementación establecerá la arquitectura base, la autenticación, el modelo de datos completo y las vistas principales. Las funciones avanzadas se irán agregando en iteraciones siguientes para garantizar calidad y consistencia.

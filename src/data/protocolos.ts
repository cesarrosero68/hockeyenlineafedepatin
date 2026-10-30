// =====================================================================
// PROTOCOLOS DE COMPETENCIA (texto que ven los jueces de mesa en Admin > Protocolos)
// Para cambiar una regla: editar este archivo y subirlo a GitHub. No hace falta tocar la base de datos.
// La clave de cada categoría debe ser IGUAL al nombre de la categoría en la plataforma
// (se ignoran mayúsculas y tildes). Una categoría sin entrada aquí muestra "Sin protocolo cargado".
// Última actualización: 30-oct-2026 (Copa 2026-II)
// =====================================================================

export type Protocolo = {
  equipos: number;        // equipos esperados
  partidos: number;       // total esperado (regulares + fase final)
  tiempo: string;
  sancion: string;
  goleada: string;
  regular: string[];      // cómo se juega la fase regular
  final: string[];        // fase final, en orden
};

export const PROTOCOLOS: Record<string, Protocolo> = {
  "Sub-8": {
    equipos: 5, partidos: 25, tiempo: "10 min", sancion: "60 seg", goleada: "No aplica",
    regular: [
      "5 equipos, todos contra todos en 2 vueltas (ida y vuelta).",
      "20 partidos regulares: cada equipo juega 8.",
    ],
    final: [
      "Juego 1: 4° vs 5° de la tabla.",
      "Semifinales: 1° vs ganador del Juego 1, y 2° vs 3°.",
      "Tercer puesto (perdedores de semis) y final (ganadores de semis).",
      "5 partidos de fase final: Juego 1 y semis el 22-nov; tercer puesto y final el 5-dic.",
    ],
  },
  "Sub-10": {
    equipos: 8, partidos: 36, tiempo: "12 min", sancion: "90 seg", goleada: "8 goles",
    regular: [
      "8 equipos en 2 grupos de 4. Grupo A: Katios Blanco, H2S Lions Blanco, Avalancha, Rabbits Blanco. Grupo B: Katios Naranja, H2S Lions Rojo, Rabbits Azul, Wild Dogs.",
      "Cada grupo juega 2 vueltas internas: 24 partidos regulares, cada equipo juega 6.",
    ],
    final: [
      "4 cruces entre grupos el 1-nov: 1°A vs 4°B, 2°A vs 3°B, 3°A vs 2°B y 4°A vs 1°B.",
      "2 semifinales entre los ganadores de los cruces.",
      "2 juegos de puestos 5-8 entre los perdedores de los cruces.",
      "5° puesto (ganadores de puestos 5-8) y 7° puesto (perdedores).",
      "Tercer puesto y final.",
      "12 partidos de fase final: cruces el 1-nov y el resto el 5 y 6-dic.",
    ],
  },
  "Sub-12": {
    equipos: 6, partidos: 33, tiempo: "12 min", sancion: "90 seg", goleada: "8 goles",
    regular: [
      "6 equipos, todos contra todos en 2 vueltas (ida y vuelta).",
      "30 partidos regulares: cada equipo juega 10.",
    ],
    final: [
      "Final directa, sin semifinales.",
      "1° vs 2°: final (oro). 3° vs 4°: tercer puesto (bronce). 5° vs 6°: quinto puesto.",
      "3 partidos de fase final: quinto puesto y tercer puesto el 5-dic; final el 6-dic.",
    ],
  },
  "Sub-14": {
    equipos: 4, partidos: 22, tiempo: "15 min", sancion: "90 seg", goleada: "8 goles",
    regular: [
      "4 equipos, todos contra todos en 3 vueltas.",
      "18 partidos regulares: cada equipo juega 9.",
    ],
    final: [
      "Semifinales directas: 1° vs 4° y 2° vs 3°.",
      "Tercer puesto (perdedores) y final (ganadores).",
      "4 partidos de fase final: semis el 5-dic; tercer puesto y final el 6-dic.",
    ],
  },
  "Sub-16 Mixto": {
    equipos: 4, partidos: 20, tiempo: "15 min", sancion: "90 seg", goleada: "8 goles",
    regular: [
      "4 equipos (Katios, Condors, Avalancha, V-Raptors), todos contra todos en 3 vueltas.",
      "18 partidos regulares: cada equipo juega 9.",
    ],
    final: [
      "Final directa, sin semifinales (solo hay 4 equipos).",
      "1° vs 2°: final (oro). 3° vs 4°: tercer puesto (bronce).",
      "2 partidos de fase final el 6-dic.",
    ],
  },
  "Femenino": {
    equipos: 5, partidos: 22, tiempo: "15 min", sancion: "90 seg", goleada: "8 goles",
    regular: [
      "5 equipos, todos contra todos en 2 vueltas (ida y vuelta).",
      "20 partidos regulares: cada equipo juega 8.",
    ],
    final: [
      "Final directa, sin semifinales.",
      "1° vs 2°: final (oro). 3° vs 4°: tercer puesto (bronce).",
      "El 5° de la tabla queda de quinto puesto, sin partido.",
      "2 partidos de fase final el 6-dic.",
    ],
  },
};

// Reglas que valen para TODAS las categorías
export const REGLAS_GENERALES: string[] = [
  "Reloj: cronómetro detenido.",
  "Calentamiento: 2 min. Entretiempo: 2 min.",
  "Tiempos muertos: 1 por periodo.",
  "Seeds: posición en la fase preliminar.",
];

export const DESEMPATES: string[] = [
  "La tabla ordena por puntos, luego diferencia de gol y luego goles a favor.",
  "Si el empate sigue en los tres criterios, o hay empate en una eliminatoria sin tiempo extra, se define a mano.",
];

export const CALENDARIO: { titulo: string; detalle: string }[] = [
  { titulo: "Grupo 1 · Sub-8, Sub-12 y Sub-16 Mixto", detalle: "F1 22-23 ago · F3 12-13 sep · F5 24-25 oct · F7 21-22 nov" },
  { titulo: "Grupo 2 · Sub-10, Sub-14 y Femenino", detalle: "F2 5-6 sep · F4 26-27 sep · F6 31 oct-1 nov · F8 28-29 nov" },
  { titulo: "Finales · todas las categorías", detalle: "5 y 6 de diciembre" },
];

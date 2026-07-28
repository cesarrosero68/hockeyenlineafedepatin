export interface BackgroundPreset {
  key: string;
  label: string;
  image: string | null;
  size?: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    key: "default",
    label: "Predeterminado (malla suave)",
    image: null,
  },
  {
    key: "plain",
    label: "Sin fondo (plano)",
    image: "none",
  },
  {
    key: "dots",
    label: "Puntos sutiles",
    image: "radial-gradient(hsl(var(--primary) / 0.16) 1px, transparent 1px)",
    size: "22px 22px",
  },
  {
    key: "grid",
    label: "Cuadrícula fina",
    image:
      "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
    size: "44px 44px, 44px 44px",
  },
  {
    key: "diagonal",
    label: "Líneas diagonales",
    image:
      "repeating-linear-gradient(45deg, hsl(var(--primary) / 0.05) 0 2px, transparent 2px 14px)",
    size: "auto",
  },
  {
    key: "gradient",
    label: "Degradado suave",
    image:
      "radial-gradient(ellipse at 15% 0%, hsl(var(--primary) / 0.14), transparent 55%), radial-gradient(ellipse at 90% 10%, hsl(var(--secondary) / 0.14), transparent 50%)",
    size: "auto",
  },
  {
    key: "aurora",
    label: "Aurora (azul-verde vibrante)",
    image:
      "radial-gradient(ellipse at 0% 50%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(ellipse at 100% 50%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.12), transparent 60%)",
    size: "auto",
  },
  {
    key: "sunset",
    label: "Atardecer (naranja-rojo-púrpura)",
    image:
      "radial-gradient(ellipse at 0% 0%, rgba(251,146,60,0.22), transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(239,68,68,0.18), transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(168,85,247,0.15), transparent 60%)",
    size: "auto",
  },
  {
    key: "ocean",
    label: "Océano (azul profundo)",
    image:
      "radial-gradient(ellipse at 20% 20%, rgba(14,165,233,0.2), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.18), transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(15,23,42,0.06), transparent 70%)",
    size: "auto",
  },
  {
    key: "forest",
    label: "Bosque (verde esmeralda)",
    image:
      "radial-gradient(ellipse at 10% 90%, rgba(16,185,129,0.2), transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(52,211,153,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(6,95,70,0.08), transparent 70%)",
    size: "auto",
  },
  {
    key: "midnight",
    label: "Medianoche (azul oscuro intenso)",
    image:
      "radial-gradient(ellipse at 25% 25%, rgba(99,102,241,0.22), transparent 55%), radial-gradient(ellipse at 75% 75%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(ellipse at 50% 0%, rgba(30,27,75,0.1), transparent 60%)",
    size: "auto",
  },
  {
    key: "fire",
    label: "Fuego (rojo-naranja intenso)",
    image:
      "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.22), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(251,146,60,0.18), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(220,38,38,0.15), transparent 55%)",
    size: "auto",
  },
  {
    key: "ice",
    label: "Hielo (blanco-celeste cristalino)",
    image:
      "radial-gradient(ellipse at 30% 30%, rgba(186,230,253,0.35), transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(224,242,254,0.3), transparent 55%), radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.4), transparent 50%)",
    size: "auto",
  },
  {
    key: "diamond",
    label: "Diamante (rombos elegantes)",
    image:
      "repeating-linear-gradient(45deg, hsl(var(--primary) / 0.06) 0 1px, transparent 1px 28px), repeating-linear-gradient(-45deg, hsl(var(--primary) / 0.06) 0 1px, transparent 1px 28px)",
    size: "auto",
  },
  {
    key: "hexagon",
    label: "Hexágonos (patrón deportivo)",
    image:
      "repeating-linear-gradient(60deg, hsl(var(--primary) / 0.07) 0 1px, transparent 1px 30px), repeating-linear-gradient(-60deg, hsl(var(--primary) / 0.07) 0 1px, transparent 1px 30px), repeating-linear-gradient(0deg, hsl(var(--primary) / 0.04) 0 1px, transparent 1px 30px)",
    size: "auto",
  },
];

export function getBackgroundPreset(key?: string | null) {
  return BACKGROUND_PRESETS.find((p) => p.key === key) ?? BACKGROUND_PRESETS[0];
}

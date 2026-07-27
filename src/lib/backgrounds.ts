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
];

export function getBackgroundPreset(key?: string | null) {
  return BACKGROUND_PRESETS.find((p) => p.key === key) ?? BACKGROUND_PRESETS[0];
}
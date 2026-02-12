export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export interface LayoutsByBreakpoint {
  lg: LayoutItem[];
  md: LayoutItem[];
  sm: LayoutItem[];
  xs: LayoutItem[];
}

export type Breakpoint = keyof LayoutsByBreakpoint;

export const BREAKPOINTS: Record<Breakpoint, number> = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
};

export const COLS: Record<Breakpoint, number> = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 2,
};

export const ROW_HEIGHT = 80;
export const LAYOUT_VERSION = 1;

export function deriveBreakpoints(lg: LayoutItem[]): LayoutsByBreakpoint {
  return {
    lg,
    md: lg.map(item => ({
      ...item,
      x: Math.min(item.x, COLS.md - Math.min(item.w, COLS.md)),
      w: Math.min(item.w, COLS.md),
    })),
    sm: lg.map(item => ({
      ...item,
      x: 0,
      w: COLS.sm,
    })),
    xs: lg.map(item => ({
      ...item,
      x: 0,
      w: COLS.xs,
    })),
  };
}

export function mergeLayoutWithRegistry(
  saved: LayoutsByBreakpoint,
  registry: Record<string, { defaultLayout: Pick<LayoutItem, 'w' | 'h' | 'minW' | 'minH'> }>
): LayoutsByBreakpoint {
  const registryIds = new Set(Object.keys(registry));

  const mergeOne = (items: LayoutItem[]): LayoutItem[] => {
    return items
      .filter(item => registryIds.has(item.i))
      .map(item => {
        const def = registry[item.i]?.defaultLayout;
        if (!def) return item;
        return {
          ...item,
          minW: def.minW ?? item.minW,
          minH: def.minH ?? item.minH,
          w: Math.max(item.w, def.minW ?? 1),
          h: Math.max(item.h, def.minH ?? 1),
        };
      });
  };

  return {
    lg: mergeOne(saved.lg),
    md: mergeOne(saved.md),
    sm: mergeOne(saved.sm),
    xs: mergeOne(saved.xs),
  };
}

export interface TeamPerformanceMember {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  calls: number;
  meetings: number;
  deals: number;
  revenue: number;
}

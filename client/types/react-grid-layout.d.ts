declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    moved?: boolean;
  }

  export interface Layouts {
    [breakpoint: string]: Layout[];
  }

  export interface ReactGridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    isDroppable?: boolean;
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    onDrag?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    onDragStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    onResizeStart?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    onResize?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    onResizeStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => void;
    children?: React.ReactNode;
    innerRef?: React.Ref<HTMLDivElement>;
  }

  export interface ResponsiveProps extends Omit<ReactGridLayoutProps, 'layout' | 'cols'> {
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    layouts?: Layouts;
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
    onWidthChange?: (containerWidth: number, margin: [number, number], cols: number, containerPadding: [number, number]) => void;
  }

  export const ResponsiveGridLayout: React.FC<ResponsiveProps>;
  export const Responsive: React.FC<ResponsiveProps>;
  export const GridLayout: React.FC<ReactGridLayoutProps>;
  export const ReactGridLayout: React.FC<ReactGridLayoutProps>;

  const DefaultExport: React.FC<ReactGridLayoutProps>;
  export default DefaultExport;
}

declare module 'react-grid-layout/css/styles.css' {}
declare module 'react-resizable/css/styles.css' {}

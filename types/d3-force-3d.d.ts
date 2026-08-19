/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "d3-force-3d" {
  interface Force<N> {
    (alpha: number): void;
    initialize?(nodes: N[], random: () => number): void;
  }

  export function forceCollide<N = any>(
    radius?: number | ((node: N) => number),
    iterations?: number
  ): Force<N>;

  export function forceManyBody<N = any>(): Force<N> & {
    strength(value: number): Force<N>;
  };

  export function forceLink<N = any>(
    links?: object[]
  ): Force<N> & {
    distance(distance: number | ((link: object) => number)): Force<N>;
  };
}

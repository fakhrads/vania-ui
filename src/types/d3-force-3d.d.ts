/**
 * d3-force-3d tidak punya paket tipe sendiri — `@types/d3-force-3d` tidak ada
 * di registry npm (404), padahal modulnya JS murni tanpa .d.ts bawaan.
 *
 * Ini paket simulasi yang dipakai force-graph di dalamnya; kita menariknya
 * langsung cuma buat satu gaya, forceCollide, jadi yang dideklarasikan di sini
 * seperlunya saja. Sengaja TIDAK memakai `declare module "d3-force-3d";`
 * polos, karena itu melebarkan seluruh modulnya jadi `any` diam-diam.
 */
declare module "d3-force-3d" {
  type RadiusAccessor<N> = number | ((node: N, i: number, nodes: N[]) => number);

  interface ForceCollide<N> {
    (alpha: number): void;
    radius(): (node: N, i: number, nodes: N[]) => number;
    radius(radius: RadiusAccessor<N>): ForceCollide<N>;
    strength(): number;
    strength(strength: number): ForceCollide<N>;
    iterations(): number;
    iterations(iterations: number): ForceCollide<N>;
  }

  export function forceCollide<N = unknown>(
    radius?: RadiusAccessor<N>
  ): ForceCollide<N>;
}

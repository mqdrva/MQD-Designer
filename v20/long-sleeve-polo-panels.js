import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only.
// Keep the collar isolated while allowing the Front/Back body panels to rise
// tight to the physical collar seam and extend farther toward each armhole.
const sleeveEdge = y => y >= 0 ? 0.455 - 0.028 * y : 0.455 - 0.038 * y;

const rules = [
  {
    zone: 4,
    tests: [
      // Tighten collar ownership so flat upper-chest/upper-back faces remain body.
      v => v[1] + 0.34 * v[2] - 0.715,
      // Keep only the actual neck/collar neighborhood instead of the broad shoulder shelf.
      v => 1 - (v[0] / 0.305) ** 2 - ((v[2] + 0.060) / 0.270) ** 2
    ]
  },
  {
    zone: 2,
    tests: [
      // Sleeve starts farther outward so the body reaches the armhole seam cleanly.
      v => v[0] - sleeveEdge(v[1])
    ]
  },
  {
    zone: 3,
    tests: [
      v => -v[0] - sleeveEdge(v[1])
    ]
  },
  {
    zone: 0,
    tests: [
      // Preserve the existing front/back split.
      v => v[2] + 0.022 + 0.108 * Math.max(0, v[1])
    ]
  }
];

export function partitionLongSleevePoloTriangle(triangle){
  return partitionWithRules(triangle, rules);
}

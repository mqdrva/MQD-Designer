import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only.
// Keeps the collar isolated, cleans the body edge around the collar,
// and lets the Front/Back panels reach farther toward the sleeve seam.
const sleeveEdge = y => y >= 0 ? 0.438 - 0.030 * y : 0.438 - 0.040 * y;

const rules = [
  {
    zone: 4,
    tests: [
      // Expand collar ownership a bit so the body sits cleaner under it.
      v => v[1] + 0.37 * v[2] - 0.672,
      // Slightly wider/deeper collar envelope.
      v => 1 - (v[0] / 0.338) ** 2 - ((v[2] + 0.055) / 0.320) ** 2
    ]
  },
  {
    zone: 2,
    tests: [
      // Push sleeve split outward so body reaches closer to sleeve seam.
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
      // Keep front/back split stable.
      v => v[2] + 0.022 + 0.108 * Math.max(0, v[1])
    ]
  }
];

export function partitionLongSleevePoloTriangle(triangle){
  return partitionWithRules(triangle, rules);
}

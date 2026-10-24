// The flat front pattern's center neckline is 67/600 below its shoulder
// peaks (front.png: y=48,115,648). The supplied GLB front opening is at
// y=.698688, shoulder .720151, body/band seam -.72. A box-only projection
// treats the pattern's neck cut-out as chest fabric and lowers chest artwork.
// Remap only Front preview UVs; retain both endpoints, all layer coordinates,
// physical partition masks and production templates. Back is untouched.
export const HOODIE_FRONT_PATTERN_NECK_T=67/600;
export const HOODIE_FRONT_MODEL_NECK_T=(.72015136129-.69868803024)/(.72015136129+.72);
export function hoodieFrontArtworkV(v){
 const t=1-v,n=HOODIE_FRONT_MODEL_NECK_T,p=HOODIE_FRONT_PATTERN_NECK_T;
 const artworkT=t<=n?t*p/n:p+(t-n)*(1-p)/(1-n);
 return 1-artworkT;
}

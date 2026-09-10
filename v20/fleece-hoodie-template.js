// Perimeters traced from the supplied hoodie red cutlines. Helper graphics and
// pocket/cuff internal lines are guides, never holes in the background fill.
export function traceFleeceHoodieTemplate(c,zone,w,h){
 const sleeve=zone.includes('Sleeve'),hood=zone==='Hood';
 c.save();c.scale(w/(hood?704:sleeve?512:zone==='Front'?686:660),h/(hood?502:sleeve?828:708));c.beginPath();
 if(hood){
  c.moveTo(67,155);c.lineTo(635,155);c.bezierCurveTo(635,248,590,287,578,363);
  c.quadraticCurveTo(352,397,127,363);c.bezierCurveTo(116,280,67,244,67,155);
 }else if(sleeve){
  c.moveTo(243,54);c.bezierCurveTo(256,77,273,78,307,81);
  c.bezierCurveTo(324,194,318,204,463,249);c.lineTo(374,667);c.lineTo(374,787);
  c.lineTo(155,787);c.lineTo(155,667);c.lineTo(78,246);
  c.bezierCurveTo(194,217,193,215,243,54);
 }else if(zone==='Front'){
  c.moveTo(265,64);c.bezierCurveTo(282,114,307,125,352,125);
  c.bezierCurveTo(401,125,419,114,438,65);
  c.bezierCurveTo(556,133,552,125,573,220);c.bezierCurveTo(580,261,596,274,634,284);
  c.bezierCurveTo(613,424,619,503,630,634);c.lineTo(72,634);
  c.bezierCurveTo(83,484,88,399,67,285);c.bezierCurveTo(115,267,121,251,132,195);
  c.bezierCurveTo(144,131,147,133,265,64);
 }else{
  c.moveTo(276,57);c.lineTo(398,57);c.lineTo(513,144);
  c.bezierCurveTo(559,177,552,209,571,256);c.bezierCurveTo(582,281,597,292,621,299);
  c.bezierCurveTo(602,432,601,486,616,650);c.lineTo(58,650);
  c.bezierCurveTo(72,485,73,421,53,301);c.bezierCurveTo(98,286,104,265,115,218);
  c.bezierCurveTo(129,162,126,170,276,57);
 }
 c.closePath();c.restore();
}

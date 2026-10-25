// Source images decode asynchronously. Serialize personal-copy edits so a later
// movement/color load cannot replace an earlier name edit with a stale snapshot.
export function createTeamEditQueue(designer,validate,notify){
 let pending=Promise.resolve();
 return {apply(mutate){const next=pending.catch(()=>{}).then(async()=>{const current=designer.exportDesign();mutate(current);validate(current);await designer.loadDesign(current,{notify:false});notify();});pending=next;return next;},flush(){return pending;}};
}

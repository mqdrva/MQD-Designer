const safe=v=>String(v||'entry').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);
export async function downloadContestProduction(request,id){
 const result=await request({action:'monthly_production',submissionId:id});
 if(!result.available)throw new Error('Production artwork needed: '+result.missing.join('; '));
 if(!window.JSZip)throw new Error('ZIP download is unavailable. Refresh and try again.');
 const zip=new window.JSZip();zip.file('design.json',JSON.stringify(result.entry.design_snapshot,null,2));
 zip.file('entry.json',JSON.stringify({id:result.entry.id,title:result.entry.label,designId:result.entry.design_id},null,2));
 zip.file('README.txt','Saved contest design and source artwork. Review dimensions, resolution, fonts, placement and garment templates before printing. This ZIP contains source artwork and layout; it is not a set of flattened print panels.');
 for(const file of result.files){const response=await fetch(file.url);if(!response.ok)throw new Error('Could not download '+file.name+'. No incomplete ZIP was saved.');const parts=file.name.split('/').map(safe);zip.file('artwork/'+parts.join('/'),await response.blob());}
 if(result.entry.preview)zip.file('submitted-preview.jpg',await (await fetch(result.entry.preview)).blob());
 const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=safe(result.entry.label)+'-contest-artwork.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}

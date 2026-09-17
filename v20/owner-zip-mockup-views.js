(()=>{
  const Zip=window.JSZip;
  if(!Zip?.prototype?.generateAsync)return;
  const originalGenerate=Zip.prototype.generateAsync;
  const views=['front','back','left-side','right-side'];

  Zip.prototype.generateAsync=async function(options,...rest){
    try{
      const names=Object.keys(this.files||{});
      let root='';
      const proofSources={};
      for(const name of names){
        const marker='original-assets/__mockup__/';
        const at=name.indexOf(marker);if(at<0)continue;
        const base=name.slice(at+marker.length).toLowerCase();
        for(const view of views)if(base===`mockup-${view}.png`){root=name.slice(0,at);proofSources[view]=name;}
      }
      if(Object.keys(proofSources).length){
        for(const view of views){
          const source=proofSources[view];if(!source)continue;
          const file=this.file(source);if(!file)continue;
          this.file(`${root}mockup-previews/${view}.png`,await file.async('uint8array'));
          this.remove(source);
        }
        this.file(`${root}mockup-previews/README.txt`,'Visual production proof generated from the customer\'s saved 3D garment design.\nIncluded views: front, back, left side, and right side.\nUse these PNGs as visual references together with the production zone files and HEX colors.\n');
      }else{
        const legacy=names.find(name=>/\/mockup\.png$/i.test(name));
        if(legacy){
          root=legacy.slice(0,legacy.length-'mockup.png'.length);
          const file=this.file(legacy);
          if(file)this.file(`${root}mockup-previews/current-view.png`,await file.async('uint8array'));
          this.file(`${root}mockup-previews/README.txt`,'This order was created before automatic front/back/left/right capture was enabled. current-view.png is the original saved mockup. New orders include all four production-proof views automatically.\n');
        }
      }
    }catch(error){console.warn('MQD production ZIP visual proof step skipped:',error);}
    return originalGenerate.call(this,options,...rest);
  };
})();

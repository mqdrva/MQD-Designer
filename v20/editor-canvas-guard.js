// MQD 2D editor display guard.
// This intentionally does not touch the upload path or the 3D garment renderer.
// When a zone already has artwork/text, hide the faint instructional template
// bitmap so the customer's real layers stay visually on top. The separate red
// cutline canvas is not an HTMLImageElement, so production cut lines still draw.
(() => {
  const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function(source, ...args){
    try{
      if(this.canvas?.id === 'editorCanvas' && source instanceof HTMLImageElement){
        const src = source.currentSrc || source.src || '';
        const hasLayer = !!document.querySelector('#layers .layer');
        if(hasLayer && src.includes('/assets/templates/')) return;
      }
    }catch(_){/* keep native canvas behavior if feature detection fails */}
    return nativeDrawImage.call(this, source, ...args);
  };
})();

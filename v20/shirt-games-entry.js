// Static launch switch: ordinary homepage visits do not call the game backend.
fetch('/shirt-games/launch.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(config=>{if(config?.enabled===true)for(const item of document.querySelectorAll('[data-shirt-games-entry]'))item.hidden=false}).catch(()=>{});

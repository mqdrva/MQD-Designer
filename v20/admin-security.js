let pendingVerification;

// Enrollment is performed only by the signed-in owner on their own device.
export async function requireAdminMfa(supabase){
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||userData.user?.app_metadata?.role!=='admin')throw new Error('An approved MQD owner account is required.');
  const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(error)throw error;
  if(data.currentLevel==='aal2')return;
  if(pendingVerification)return pendingVerification;
  pendingVerification=showVerification(supabase).finally(()=>{pendingVerification=null;});
  return pendingVerification;
}

function showVerification(supabase){
  return new Promise((resolve,reject)=>{
    const dialog=document.createElement('dialog');
    dialog.style.cssText='max-width:420px;width:calc(100% - 40px);padding:24px;border:1px solid #ddd;border-radius:12px;font:15px Arial,sans-serif';
    dialog.innerHTML='<h2>Protect your owner account</h2><p data-intro>Use an authenticator app to verify access to customer orders and private files.</p><div data-setup></div><form><label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required style="display:block;width:90%;padding:12px;margin:12px 0;font:inherit"></label><button type="submit" style="padding:10px 16px">Verify</button> <button type="button" data-cancel style="padding:10px 16px">Cancel</button></form><p role="status" aria-live="polite"></p><p style="font-size:12px;color:#666">Keep access to your authenticator app. If you lose it, recovery requires the Supabase project owner to reset your factor.</p>';
    document.body.appendChild(dialog);dialog.showModal();
    const form=dialog.querySelector('form'),status=dialog.querySelector('[role="status"]'),setup=dialog.querySelector('[data-setup]');
    let factorId=null,finished=false;
    const finish=(error)=>{if(finished)return;finished=true;dialog.close();dialog.remove();error?reject(error):resolve();};
    dialog.querySelector('[data-cancel]').onclick=()=>finish(new Error('Owner verification cancelled.'));
    dialog.addEventListener('cancel',e=>{e.preventDefault();finish(new Error('Owner verification cancelled.'));});
    form.hidden=true;
    async function prepare(){
      const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
      const verified=data.totp.find(f=>f.status==='verified');
      if(verified){factorId=verified.id;form.hidden=false;form.elements.code.focus();return;}
      const start=document.createElement('button');start.type='button';start.textContent='Set up authenticator';start.style.padding='10px 16px';setup.appendChild(start);
      start.onclick=async()=>{
        start.disabled=true;status.textContent='Preparing setup…';
        try{
          // Remove only unfinished setup attempts made by this page, never active factors.
          for(const f of data.all||[])if(f.status==='unverified'&&f.friendly_name?.startsWith('MQD Owner ')){const result=await supabase.auth.mfa.unenroll({factorId:f.id});if(result.error)throw result.error;}
          const result=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'MQD Owner '+Date.now(),issuer:'Morales Quality Designs'});if(result.error)throw result.error;
          if(finished)return;
          factorId=result.data.id;setup.replaceChildren();
          const p=document.createElement('p');p.textContent='Scan this QR code with your authenticator app, then enter its six-digit code below.';
          const img=document.createElement('img');img.alt='Authenticator setup QR code';img.width=220;img.height=220;const qr=result.data.totp.qr_code;img.src=qr.startsWith('data:')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
          const details=document.createElement('details'),summary=document.createElement('summary'),secret=document.createElement('code');summary.textContent='Manual setup key';secret.textContent=result.data.totp.secret;secret.style.overflowWrap='anywhere';details.append(summary,secret);setup.append(p,img,details);
          form.hidden=false;status.textContent='';form.elements.code.focus();
        }catch(error){status.textContent=error.message;start.disabled=false;}
      };
    }
    form.onsubmit=async e=>{
      e.preventDefault();if(!factorId)return;
      const button=form.querySelector('[type="submit"]');button.disabled=true;status.textContent='Verifying…';
      try{const {error}=await supabase.auth.mfa.challengeAndVerify({factorId,code:form.elements.code.value.trim()});if(error)throw error;finish();}
      catch(error){status.textContent=error.message;form.elements.code.value='';button.disabled=false;}
    };
    prepare().catch(error=>{status.textContent=error.message;});
  });
}

const BUCKET='mqd-contest-media';
const validId=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
async function signed(db:any,path:string){const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,300);if(error)throw new Error('Video is temporarily unavailable.');return data.signedUrl;}
export async function reviewVideo(db:any,entry:any){return entry.video_path?await signed(db,entry.video_path):null;}
export function validPicture(value:unknown){
 if(typeof value!=='string'||value.length>700000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value))return false;
 try{const bytes=atob(value.split(',')[1]);return value.startsWith('data:image/png')?bytes.startsWith('\x89PNG\r\n\x1a\n'):bytes.startsWith('\xff\xd8\xff');}catch{return false;}
}
export function validVideo(bytes:Uint8Array,type:string){return type==='video/mp4'?bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp':type==='video/webm'&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;}
export async function mediaAction(b:any,db:any,json:any,user:any){
 if(b.action==='monthly_video'){
  if(!validId(b.optionId))throw new Error('Choose a contest entry.');
  const {data:entry,error}=await db.from('mqd_contest_submissions').select('video_path,option_id').eq('option_id',b.optionId).eq('status','approved').maybeSingle();if(error)throw error;
  if(!entry?.video_path)return json({videoUrl:null});
  const {data:option,error:oe}=await db.from('mqd_contest_options').select('id').eq('id',entry.option_id).eq('eligible',true).maybeSingle();if(oe)throw oe;
  return json({videoUrl:option?await signed(db,entry.video_path):null});
 }
 if(!user)return null;
 if(b.action==='monthly_upload_ticket'){
  if(!validId(b.contestId)||!['video/mp4','video/webm'].includes(b.type)||!Number.isInteger(b.size)||b.size<12||b.size>25*1024*1024)throw new Error('Choose an MP4 or WebM video up to 25 MB.');
  const {data:path,error}=await db.rpc('mqd_monthly_video_reserve',{p_contest:b.contestId,p_user:user.id,p_type:b.type});if(error)throw error;
  const {data,error:ue}=await db.storage.from(BUCKET).createSignedUploadUrl(path);if(ue)throw new Error('Could not prepare video upload. Please try again.');
  return json({bucket:BUCKET,path,token:data.token});
 }
 if(b.action==='monthly_upload_submit'){
  if(!validId(b.contestId)||b.consent!==true)throw new Error('Choose the round and confirm permission to publish.');
  const label=String(b.label||'').trim();if(!label||label.length>100)throw new Error('Enter a title of up to 100 characters.');
  if(!validPicture(b.preview))throw new Error('Choose a valid PNG or JPEG shirt picture.');
  let video=null;
  if(b.videoPath){
   if(typeof b.videoPath!=='string'||!b.videoPath.startsWith(user.id+'/'+b.contestId+'/'))throw new Error('Choose your own uploaded video.');
   const {data:reservation,error}=await db.from('mqd_contest_video_uploads').select('path,mime_type').eq('path',b.videoPath).eq('user_id',user.id).eq('contest_id',b.contestId).maybeSingle();if(error||!reservation)throw new Error('Video upload not found. Please select the video again.');
   const {data:blob,error:ve}=await db.storage.from(BUCKET).download(reservation.path);if(ve||!blob||blob.size>25*1024*1024||blob.type!==reservation.mime_type||!validVideo(new Uint8Array(await blob.slice(0,16).arrayBuffer()),reservation.mime_type))throw new Error('Choose a valid MP4 or WebM video up to 25 MB.');
   video=reservation.path;
  }
  const {data:submissionId,error}=await db.rpc('mqd_monthly_upload_submit',{p_contest:b.contestId,p_user:user.id,p_label:label,p_email:user.email,p_preview:b.preview,p_video:video});if(error)throw error;
  return json({submissionId,status:'pending'});
 }
 return null;
}

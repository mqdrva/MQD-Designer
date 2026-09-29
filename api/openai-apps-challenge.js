export default function handler(req,res){
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    res.statusCode=405;
    return res.end('Method not allowed');
  }
  const token=String(process.env.OPENAI_APPS_CHALLENGE_TOKEN||'').trim();
  if(!token){
    res.statusCode=404;
    return res.end('Not configured');
  }
  res.statusCode=200;
  return res.end(token);
}

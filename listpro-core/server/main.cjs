'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Worker}=require('node:worker_threads');
const engine=require('../web/engine.cjs'),edges=require('../web/edge-banding.js');
function createService(config){
 if(!config.user||!/^([a-f0-9]{2}){16}$/i.test(config.salt||'')||!/^([a-f0-9]{2}){64}$/i.test(config.hash||''))throw Error('Configure LISTPRO_USER, LISTPRO_PASSWORD_SALT and LISTPRO_PASSWORD_HASH before starting');
 const jobs=new Map(),queue=[],failedAuth=new Map();let active=null,closing=false,credentialDigest=null;
 const memoryPath=path.join(config.dataDir,'experience-completed-v1.json'),maxQueue=config.maxQueue??3;
 const send=(res,code,data,headers={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
 function authenticated(req,res){
  const header=req.headers.authorization||'',digest=crypto.createHash('sha256').update(header).digest();if(credentialDigest&&crypto.timingSafeEqual(digest,credentialDigest))return true;
  const ip=req.headers['x-real-ip']||req.socket.remoteAddress,now=Date.now(),previous=failedAuth.get(ip),limit=previous&&now-previous.at<60000?previous:{at:now,n:0};
  if(limit.n>=5){send(res,429,{error:'Слишком много попыток входа. Повторите через минуту.'});return false;}
  let ok=false;if(header.length<2048&&header.startsWith('Basic ')){const decoded=Buffer.from(header.slice(6),'base64').toString('utf8'),colon=decoded.indexOf(':');if(decoded.slice(0,colon)===config.user){const value=crypto.scryptSync(decoded.slice(colon+1),Buffer.from(config.salt,'hex'),64);ok=crypto.timingSafeEqual(value,Buffer.from(config.hash,'hex'));}}
  if(ok){credentialDigest=digest;failedAuth.delete(ip);return true;}limit.n++;if(failedAuth.size>1024)failedAuth.clear();failedAuth.set(ip,limit);send(res,401,{error:'Требуется вход'},{'WWW-Authenticate':'Basic realm="ListPro", charset="UTF-8"'});return false;
 }
 function pump(){if(closing||active||!queue.length)return;const job=queue.shift();active=job;job.status='running';
  const worker=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{input:job.input,memoryPath},resourceLimits:{maxOldGenerationSizeMb:768,stackSizeMb:16}});job.worker=worker;
  function interrupted(reason){if(job.status!=='running')return;if(job.checkpoint){job.status='done';job.result=job.checkpoint;job.warning=reason+' Показан лучший сохранённый проверенный раскрой. Оптимизация не завершена; этот промежуточный результат не добавлен в базу опыта.';}else{job.status='failed';job.error=reason+' Проверенная карта ещё не получена.';}}
  const timer=setTimeout(()=>{interrupted('Достигнут лимит времени расчёта (5 минут).');worker.terminate();},config.timeoutMs??300000);
  worker.on('message',m=>{if(job.status!=='running')return;if(m.type==='progress')job.progress=m.data;else if(m.type==='checkpoint'){job.checkpoint=m.json;job.bestSheets=m.sheets;}else if(m.type==='result'){job.status='done';job.result=m.json;worker.terminate();}else{interrupted(m.message||'Ошибка оптимизации.');worker.terminate();}});
  worker.on('error',e=>{interrupted(e.message);});worker.on('exit',()=>{clearTimeout(timer);if(job.status==='running')interrupted('Расчёт прерван.');delete job.checkpoint;job.finished=Date.now();delete job.worker;delete job.input;active=null;const complete=[...jobs.values()].filter(j=>j.finished).sort((a,b)=>b.finished-a.finished);complete.slice(4).forEach(j=>jobs.delete(j.id));pump();});
 }
 const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/healthz'&&req.method==='GET'){send(res,200,{ok:!closing,service:'listpro'});return;}if(!authenticated(req,res))return;
  if(['POST','DELETE'].includes(req.method)){if(req.headers['sec-fetch-site']==='cross-site'){send(res,403,{error:'Недопустимый источник запроса'});return;}if(req.headers.origin&&req.headers.origin!==`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`){send(res,403,{error:'Недопустимый источник запроса'});return;}}
  if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});fs.createReadStream(config.indexPath||path.join(__dirname,'dist/index.html')).pipe(res);return;}
  if(req.url==='/api/jobs'&&req.method==='POST'){
   if(closing||queue.length>=maxQueue){send(res,429,{error:'Очередь заполнена. Повторите позже.'});return;}
   if(!req.headers['content-type']?.startsWith('application/json')){send(res,415,{error:'Требуется JSON'});return;}
   const parts=[];let bytes=0;for await(const b of req){bytes+=b.length;if(bytes>256*1024){send(res,413,{error:'Слишком большой запрос'});return;}parts.push(b);}
   const input=JSON.parse(Buffer.concat(parts).toString('utf8')),p=engine.clean(input);
   if(!Number.isFinite(Number(input.thickness))||Number(input.thickness)<=0||Number(input.thickness)>1000)throw Error('Укажите толщину материала');
   p.material=String(input.material||'Листовой материал').slice(0,60);p.thickness=Number(input.thickness);p.objective=input.objective==='cuts'?'cuts':'remnants';p.partOrder=input.partOrder==='optimized'?'optimized':'descending';p.pieces.forEach((a,i)=>a.edges=edges.normalize(input.pieces[i].edges));
   if(closing||queue.length>=maxQueue){send(res,429,{error:'Очередь заполнена. Повторите позже.'});return;}
   const id=crypto.randomUUID(),job={id,status:'queued',progress:{text:'В очереди',percent:0},input:p};jobs.set(id,job);queue.push(job);pump();send(res,202,{id});return;
  }
  const route=req.url?.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
  if(route){const job=jobs.get(route[1]);if(!job){send(res,404,{error:'Задача не найдена или срок хранения истёк'});return;}
   if(req.method==='GET'){if(job.status==='done'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end('{"status":"done","searchComplete":'+(!job.warning)+',"warning":'+JSON.stringify(job.warning||null)+',"result":'+job.result+'}');}else send(res,200,{status:job.status,progress:job.progress,bestSheets:job.bestSheets,error:job.error});return;}
   if(req.method==='DELETE'){if(job.status==='queued'){queue.splice(queue.indexOf(job),1);job.status='cancelled';job.finished=Date.now();delete job.input;}else if(job.status==='running'){job.status='cancelled';job.worker.terminate();}send(res,202,{status:job.status});return;}
  }
  send(res,404,{error:'Не найдено'});
 }catch(e){if(!res.headersSent)send(res,400,{error:e.message});else res.end();}});
 server.requestTimeout=30000;server.headersTimeout=10000;
 const sweeper=setInterval(()=>{for(const [id,j]of jobs)if(j.finished&&Date.now()-j.finished>1800000)jobs.delete(id);},60000);sweeper.unref();
 async function close(){closing=true;clearInterval(sweeper);queue.splice(0);if(active?.worker)await active.worker.terminate();await new Promise(resolve=>server.close(resolve));}
 return {server,close};
}
if(require.main===module){const service=createService({user:process.env.LISTPRO_USER,salt:process.env.LISTPRO_PASSWORD_SALT,hash:process.env.LISTPRO_PASSWORD_HASH,dataDir:process.env.LISTPRO_DATA_DIR||'/var/lib/listpro'});service.server.listen(Number(process.env.LISTPRO_PORT)||3127,'127.0.0.1',()=>console.log('ListPro listening on loopback'));for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>service.close().then(()=>process.exit(0)));}
module.exports={createService};

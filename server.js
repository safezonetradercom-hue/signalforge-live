const http=require('http'),fs=require('fs'),path=require('path'),{URL}=require('url');
const ROOT=path.resolve(__dirname,'..'),PUBLIC=path.join(ROOT,'public'),DB=path.join(ROOT,'server','data.json'),PORT=Number(process.env.PORT||8787);
const allowed=new Set(['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','USDCHF','NZDUSD','EURJPY','GBPJPY','EURGBP','EURAUD','EURCAD','EURCHF','EURNZD','GBPAUD','GBPCAD','GBPCHF','GBPNZD','AUDJPY','AUDCAD','AUDCHF','AUDNZD','CADJPY','CADCHF','CHFJPY','NZDJPY','NZDCAD','NZDCHF','EURSEK','EURNOK','EURPLN','EURHUF','EURTRY','USDSEK','USDNOK','USDMXN','USDZAR','USDSGD','USDHKD','USDPLN','USDCNH','XAUUSD','XAGUSD','BTCUSD','ETHUSD']),intervals=new Set(['1m','5m','15m','30m','1h','4h','1d']);
function readDB(){try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch{return {trades:[],settings:{signalThreshold:65,autoRefreshSeconds:15},users:[]}}}
function writeDB(db){fs.writeFileSync(DB,JSON.stringify(db,null,2))}
function send(res,code,data,type='application/json; charset=utf-8'){res.writeHead(code,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(typeof data==='string'?data:JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}
 if(url.pathname==='/api/health')return send(res,200,{ok:true,service:'SignalForge Pro',mode:'paper-trading',otcConfigured:false});
 if(url.pathname==='/api/ohlc'){
  const symbol=(url.searchParams.get('symbol')||'EURUSD').toUpperCase(),interval=url.searchParams.get('interval')||'1m',limit=Math.min(200,Math.max(30,Number(url.searchParams.get('limit')||200)));
  if(!allowed.has(symbol))return send(res,400,{error:'Symbol not allowed'});if(!intervals.has(interval))return send(res,400,{error:'Unsupported interval'});
  try{const r=await fetch(`https://biquote.io/api/${encodeURIComponent(symbol)}/ohlc?interval=${encodeURIComponent(interval)}&limit=${limit}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)return send(res,502,{error:`Data provider returned ${r.status}`});return send(res,200,await r.json())}catch{return send(res,502,{error:'Real-market data feed unavailable'})}
 }
 if(url.pathname==='/api/admin/summary'&&req.method==='GET'){
  const db=readDB(),trades=db.trades;const wins=trades.filter(t=>t.result==='WIN'),losses=trades.filter(t=>t.result==='LOSS');
  return send(res,200,{mode:'PAPER ONLY',totalTrades:trades.length,wins:wins.length,losses:losses.length,openTrades:trades.filter(t=>t.result==='OPEN').length,totalProfit:trades.reduce((s,t)=>s+Number(t.pnl||0),0),winRate:trades.length?Math.round(wins.length/trades.length*100):0,settings:db.settings,recent:trades.slice(-50).reverse()});
 }
 if(url.pathname==='/api/admin/settings'&&req.method==='POST'){
  let body='';req.on('data',d=>body+=d);req.on('end',()=>{try{const b=JSON.parse(body),db=readDB();if(Number.isFinite(Number(b.signalThreshold)))db.settings.signalThreshold=Math.max(0,Math.min(100,Number(b.signalThreshold)));if(Number.isFinite(Number(b.autoRefreshSeconds)))db.settings.autoRefreshSeconds=Math.max(5,Math.min(300,Number(b.autoRefreshSeconds)));writeDB(db);send(res,200,{ok:true,settings:db.settings})}catch{send(res,400,{error:'Invalid settings'})}});return;
 }
 if(url.pathname==='/api/paper-trades'&&req.method==='POST'){
  let body='';req.on('data',d=>body+=d);req.on('end',()=>{try{const b=JSON.parse(body);if(!['CALL','PUT'].includes(b.direction)||!Number.isFinite(Number(b.stake))||Number(b.stake)<=0) return send(res,400,{error:'Direction and positive stake required'});const db=readDB(),t={id:Date.now().toString(36),symbol:String(b.symbol||'EURUSD').slice(0,20),direction:b.direction,stake:Number(b.stake),entryPrice:Number(b.entryPrice)||0,expiryMinutes:Math.max(1,Math.min(3,Number(b.expiryMinutes)||1)),result:'OPEN',pnl:0,createdAt:new Date().toISOString(),note:'Paper trade only; not sent to a broker'};db.trades.push(t);writeDB(db);return send(res,201,t)}catch{return send(res,400,{error:'Invalid request'})}});return;
 }
 if(url.pathname.startsWith('/api/paper-trades/')&&req.method==='POST'){
  const id=url.pathname.split('/').pop();let body='';req.on('data',d=>body+=d);req.on('end',()=>{try{const b=JSON.parse(body),db=readDB(),t=db.trades.find(x=>x.id===id);if(!t)return send(res,404,{error:'Trade not found'});if(t.result!=='OPEN')return send(res,400,{error:'Trade already settled'});const outcome=b.result;if(!['WIN','LOSS','DRAW'].includes(outcome))return send(res,400,{error:'Result must be WIN, LOSS or DRAW'});t.result=outcome;t.pnl=outcome==='WIN'?Number((t.stake*.8).toFixed(2)):outcome==='LOSS'?-t.stake:0;t.settledAt=new Date().toISOString();writeDB(db);return send(res,200,t)}catch{return send(res,400,{error:'Invalid request'})}});return;
 }
 let p=decodeURIComponent(url.pathname);if(p==='/')p='/index.html';const target=path.resolve(PUBLIC,'.'+p);if(!target.startsWith(PUBLIC+path.sep)&&target!==PUBLIC)return send(res,403,{error:'Forbidden'});fs.readFile(target,(e,b)=>{if(e)return send(res,404,'Not found','text/plain; charset=utf-8');send(res,200,b.toString(),({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}[path.extname(target)]||'application/octet-stream'))});
});
server.listen(PORT,()=>console.log(`SignalForge Pro at http://localhost:${PORT}`));

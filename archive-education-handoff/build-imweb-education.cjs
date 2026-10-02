const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'imweb-handoff');
fs.mkdirSync(path.join(out, 'code-blocks'), {recursive:true});
fs.mkdirSync(path.join(out, 'assets'), {recursive:true});
const home = fs.readFileSync('index.html','utf8');
const logo = home.match(/class="logo" src="data:image\/png;base64,([^"]+)"/)[1];
fs.writeFileSync(path.join(out,'assets','logo.png'),Buffer.from(logo,'base64'));
const routes = {'index.html':'/','free-classes.html':'/free-classes','premium.html':'/premium','resources.html':'/resources','mentors.html':'/mentors','class-1.html':'/class-1','class-2.html':'/class-2','class-3.html':'/class-3','premium-detail.html':'/premium-detail','support.html':'/support','terms.html':'/terms','privacy.html':'/privacy','login.html':'','signup.html':''};
// Recursively scope rules while preserving media queries and declarations.
function scopeCSS(css) {
  let result='', pos=0;
  while(pos<css.length){const start=css.indexOf('{',pos);if(start<0){result+=css.slice(pos);break;}const pre=css.slice(pos,start);let depth=1,end=start+1;for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
    const inner=css.slice(start+1,end-1);
    if(pre.trim().startsWith('@')) result+=pre+'{'+scopeCSS(inner)+'}';
    else result+=pre.split(',').map(s=>{s=s.trim().replace(/\bhtml\b|\bbody\b/g,'.sr-site');return s.startsWith('.sr-site')?s:'.sr-site '+s;}).join(',')+'{'+inner+'}';
    pos=end;
  }return result;
}
const config = {logoUrl:'',showCustomHeader:true,showCustomFooter:true,links:routes,loginUrl:'',signupUrl:'',applicationUrls:{'class-1':'','class-2':'','class-3':''},premiumPurchaseUrl:''};
fs.writeFileSync(path.join(out,'CONFIG.example.json'),JSON.stringify(config,null,2));
let count=0;
for(const [file,url] of Object.entries(routes)) {
  if(['login.html','signup.html'].includes(file))continue;
  const html=fs.readFileSync(file,'utf8');
  const styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>scopeCSS(m[1])).join('\n');
  let body=html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const scripts=[...body.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  body=body.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace(/<div class="notice">[\s\S]*?<\/div>/g,'');
  body=body.replace(/<img class="logo"[^>]+>/,'<img class="logo" data-sr-logo alt="시크릿루트" hidden><strong data-sr-logo-fallback style="font-size:24px;color:#252820">시크릿루트<span style="color:#b3975a">↗</span></strong>');
  body=body.replace(/href="([^"]+\.html)"/g,(m,f)=>`href="${routes[f]||'#'}" data-sr-link="${f}"`);
  body=body.replace(/onclick="([^"]*)"/g,(m,action)=>`data-sr-action="${action}"`);
  body=body.replace(/href="resource-(\d).txt" download/g,'href="#" data-sr-download="$1"');
  const id='sr-'+file.replace('.html','');
  let js=scripts.replace(/document\.querySelectorAll\(/g,'root.querySelectorAll(').replace(/document\.querySelector\(/g,'root.querySelector(').replace(/document\.getElementById\(/g,'rootGet(').replace(/document\.body\.append\(/g,'root.append(').replace(/window\.notify=/g,'notify=').replace(/window\.openInfo=/g,'openInfo=');
  js=js.replace("location.pathname.split('/').pop()||'index.html'",JSON.stringify(file));
  js=js.replace("a.getAttribute('href')===currentFile","a.dataset.srLink===currentFile");
  const downloads=[1,2,3].map(n=>fs.readFileSync('resource-'+n+'.txt','utf8'));
  const runtime=`\n(()=>{const root=document.getElementById(${JSON.stringify(id)});if(!root||root.dataset.initialized)return;root.dataset.initialized='true';const rootGet=id=>root.querySelector('[id="'+id+'"]');var notify,openInfo;const CONFIG=${JSON.stringify(config,null,2)};\n${js}\nroot.querySelectorAll('[data-sr-action]').forEach(el=>{el.onclick=()=>{if(el.closest('.signup-box'))return;new Function('setSlide','changeSlide','notify','openInfo','root',el.dataset.srAction.replace(/document.querySelector/g,'root.querySelector'))(typeof setSlide==='function'?setSlide:null,typeof changeSlide==='function'?changeSlide:null,notify,openInfo,root)}});\nconst image=root.querySelector('[data-sr-logo]');if(CONFIG.logoUrl){image.src=CONFIG.logoUrl;image.hidden=false;root.querySelector('[data-sr-logo-fallback]').hidden=true;}\nif(!CONFIG.showCustomHeader){root.querySelector('header').style.display='none';}if(!CONFIG.showCustomFooter){root.querySelector('footer').style.display='none';}\nfunction resolveLink(file){return file==='login.html'?CONFIG.loginUrl:file==='signup.html'?CONFIG.signupUrl:CONFIG.links[file];}\nroot.querySelectorAll('[data-sr-link]').forEach(a=>{const url=resolveLink(a.dataset.srLink);if(url){a.href=url}else{a.onclick=e=>{e.preventDefault();openInfo('연결 준비 중','아임웹 기본 회원 페이지 주소를 CONFIG에 설정해 주세요.')}}});\nroot.addEventListener('click',e=>{const a=e.target.closest('.dialog-actions a');if(!a)return;const key=a.getAttribute('href');if(CONFIG.links[key]){e.preventDefault();location.href=CONFIG.links[key]}});\nconst applicationUrl=CONFIG.applicationUrls[${JSON.stringify(file.replace('.html',''))}];root.querySelectorAll('.signup-box button').forEach(b=>{if(applicationUrl)b.onclick=()=>location.href=applicationUrl});if(${JSON.stringify(file)}==='premium-detail.html'&&CONFIG.premiumPurchaseUrl){const a=document.createElement('a');a.className='cta';a.href=CONFIG.premiumPurchaseUrl;a.textContent='상품 페이지에서 구매하기';root.querySelector('.panel').append(a)}\nconst downloads=${JSON.stringify(downloads)};root.querySelectorAll('[data-sr-download]').forEach(a=>a.onclick=e=>{e.preventDefault();const n=Number(a.dataset.srDownload);const url=URL.createObjectURL(new Blob(['\\uFEFF'+downloads[n-1]],{type:'text/plain;charset=utf-8'}));const temp=document.createElement('a');temp.href=url;temp.download='secret-route-resource-'+n+'.txt';temp.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});\n})();`;
  // Keep the scoped source handlers for application buttons unless configured.
  const fixedRuntime=runtime.replace("el.onclick=()=>{if(el.closest('.signup-box'))return;", "if(el.closest('.signup-box'))return;el.onclick=()=>{");
  // Give top-layer modal the scope class too, so scoped dialog CSS applies.
  body=body.replace('class="site-dialog"','class="site-dialog sr-site"');
  const code=`<!-- 아임웹 일반 코드 위젯에 전체 붙여넣기. 아래 CONFIG에서 주소/로고 설정 -->\n<style>${styles}\n.sr-site{font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;color:#191a18;letter-spacing:-.035em;background:#fff}.sr-site [hidden]{display:none!important}.sr-site .site-dialog{font-family:inherit}.site-dialog.sr-site::backdrop{background:#181d18a1;backdrop-filter:blur(3px)}</style>\n<div id="${id}" class="sr-site">${body}</div>\n<script>${fixedRuntime}</script>`;
  fs.writeFileSync(path.join(out,'code-blocks',file.replace('.html','.txt')),code);
  count++;
}
console.log('Generated '+count+' Imweb code blocks');

const defaults={autoAccept:true,dpsEnabled:true,compactMode:false}; const ids=["autoAccept","dpsEnabled","compactMode"];
chrome.storage.sync.get(defaults,v=>ids.forEach(id=>document.getElementById(id).checked=v[id]));
chrome.storage.local.get({acceptedCount:0},v=>document.getElementById("count").textContent=v.acceptedCount);
async function notify(settings){const tabs=await chrome.tabs.query({url:["*://huntera.com.br/*","*://*.huntera.com.br/*"]});tabs.forEach(tab=>chrome.tabs.sendMessage(tab.id,{type:"settings",settings}).catch(()=>{}));}
ids.forEach(id=>document.getElementById(id).addEventListener("change",e=>{const settings={[id]:e.target.checked};chrome.storage.sync.set(settings);notify(settings);}));
document.getElementById("reset").onclick=async()=>{const tabs=await chrome.tabs.query({url:["*://huntera.com.br/*","*://*.huntera.com.br/*"]});tabs.forEach(tab=>chrome.tabs.sendMessage(tab.id,{type:"reset"}).catch(()=>{}));};

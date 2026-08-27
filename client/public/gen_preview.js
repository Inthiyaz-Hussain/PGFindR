const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.startsWith('Screenshot') && f.endsWith('.png'));
let html = '<html style="background:#fff;"><body style="display:flex;flex-wrap:wrap;color:#000;">';
files.forEach(f => {
  html += `<div style="margin:10px;border:1px solid #ccc;padding:10px;"><h3>${f}</h3><img src="${f}" style="max-width:300px;max-height:300px;"></div>`;
});
html += '</body></html>';
fs.writeFileSync('preview.html', html);

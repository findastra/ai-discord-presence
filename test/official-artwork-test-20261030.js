import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {decodePng} from '../image-bridge/galaxy-tools.mjs';

for(const brand of ['openai','anthropic']){
  const base=new URL('../'+brand+'-discord-presence/',import.meta.url);
  const {validateConfig,GALAXY_URL}=await import(new URL('src/presence.js',base));
  test(brand+': saved built-in artwork refreshes while custom images and sharing settings survive',()=>{
    for(const image of [GALAXY_URL.replace('?v=9','?v=8'),GALAXY_URL.split('?')[0]]){
      const result=validateConfig({clientId:'123456789012345678',image,shareProject:true,automaticOnStart:true});
      assert.equal(result.image,GALAXY_URL);assert.equal(result.shareProject,true);assert.equal(result.automaticOnStart,true);
    }
    for(const image of ['custom_art','https://example.com/galaxy.gif?v=8'])assert.equal(validateConfig({clientId:'123456789012345678',image}).image,image);
  });
  test(brand+': official artwork has detailed particles and an exactly black outside margin',()=>{
    const context={window:{}};vm.runInNewContext(readFileSync(new URL('public/official-galaxy-data-20261030.js',base),'utf8'),context);
    const entry=context.window.officialGalaxyData[brand];assert(entry.starCount>20000);
    const bytes=Buffer.from(entry.stars,'base64');assert.equal(bytes.length,entry.count*48);
    for(let i=0;i<bytes.length;i+=4)assert(Number.isFinite(bytes.readFloatLE(i)));
    const {W,H,rgb}=decodePng(new URL('public/official-galaxy-still-20261030.png',base));assert.equal(W,1024);assert.equal(H,1024);
    let red=0,blue=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*3;
      if(x<8||y<8||x>=W-8||y>=H-8)assert.equal(rgb[i]+rgb[i+1]+rgb[i+2],0);
      const r=Math.hypot(x-W/2,y-H/2);if(r>40&&r<350){red+=rgb[i];blue+=rgb[i+2];}
    }
    assert(brand==='openai'?blue>red*1.1:red>blue*1.5);
  });
  test(brand+': download contains the exact tested artwork runtime and fallback',()=>{
    const zip=readFileSync(new URL('../downloads/'+brand+'-discord-presence.zip',import.meta.url)),files=new Map();
    let offset=0;
    while(zip.readUInt32LE(offset)===0x04034b50){
      assert.equal(zip.readUInt16LE(offset+8),0,'download uses the existing uncompressed ZIP format');
      const bytes=zip.readUInt32LE(offset+18),names=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28);
      const name=zip.toString('utf8',offset+30,offset+30+names),start=offset+30+names+extra;
      files.set(name,zip.subarray(start,start+bytes));offset=start+bytes;
    }
    for(const file of ['index.html','style.css','official-galaxy-data-20261030.js','official-galaxy-renderer-20261030.js','official-galaxy-still-20261030.png','galaxy.gif']){
      const packed=files.get(brand+'-discord-presence/public/'+file),source=readFileSync(new URL('public/'+file,base));
      assert(packed,file+' must be packaged');
      // Git may check text out with CRLF on Windows; that must not fail a ZIP audit.
      if(/\.(js|css|html)$/.test(file))assert.equal(packed.toString('utf8').replaceAll('\r\n','\n'),source.toString('utf8').replaceAll('\r\n','\n'),file+' text must match source');
      else assert.deepEqual(packed,source,file+' binary bytes must match source');
    }
  });
}

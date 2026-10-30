import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const project = fileURLToPath(new URL('../', import.meta.url));
const { decodePng } = await import(pathToFileURL(project + '/image-bridge/galaxy-tools.mjs'));
let seed = 33107;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const tau = Math.PI * 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

function prepare(brand) {
  const source = project + '/' + brand + '-discord-presence/public/galaxy.png';
  const {W, H, rgb} = decodePng(source);
  assert.equal(W, 1024); assert.equal(H, W);
  const lum = new Float32Array(W * H);
  for(let i=0; i<lum.length; i++) lum[i] = (rgb[i*3] + rgb[i*3+1] + rgb[i*3+2])/3;
  const summed=new Float64Array((W+1)*(H+1));
  for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=lum[y*W+x];summed[(y+1)*(W+1)+x+1]=summed[y*(W+1)+x+1]+row;}}
  const density=(x,y)=>{const x0=Math.max(0,x-10),y0=Math.max(0,y-10),x1=Math.min(W,x+11),y1=Math.min(H,y+11),s=W+1;return(summed[y1*s+x1]-summed[y0*s+x1]-summed[y1*s+x0]+summed[y0*s+x0])/((x1-x0)*(y1-y0));};
  const sample = (x,y) => {
    const ix=Math.max(0,Math.min(W-2,Math.floor(x))), iy=Math.max(0,Math.min(H-2,Math.floor(y)));
    const fx=x-ix,fy=y-iy;
    return (lum[iy*W+ix]*(1-fx)+lum[iy*W+ix+1]*fx)*(1-fy)+(lum[(iy+1)*W+ix]*(1-fx)+lum[(iy+1)*W+ix+1]*fx)*fy;
  };
  // Measure a common spiral streamline from the original art. Ring correlations
  // determine the winding; no replacement arm drawing or external star artwork.
  const rings=256, bins=720, minR=24, maxR=490;
  const profiles=[];
  for(let j=0;j<rings;j++) {
    const r=minR+(maxR-minR)*j/(rings-1), p=new Float32Array(bins);
    for(let k=0;k<bins;k++) for(let dr=-3;dr<=3;dr++) {
      const a=tau*k/bins; p[k]+=sample(W/2+Math.cos(a)*(r+dr),H/2+Math.sin(a)*(r+dr))/7;
    }
    const sm=new Float32Array(bins);
    for(let k=0;k<bins;k++) for(let d=-4;d<=4;d++) sm[k]+=p[(k+d+bins)%bins]/9;
    profiles.push(sm);
  }
  const angle=new Float32Array(rings);
  for(let j=1;j<rings;j++) {
    const before=Math.max(0,j-8),after=Math.min(rings-1,j+8);
    let best=-Infinity,shift=0;
    for(let d=-72;d<=72;d++) {
      let score=0;
      for(let k=0;k<bins;k++) score+=profiles[before][k]*profiles[after][(k+d+bins)%bins];
      if(score>best){best=score;shift=d;}
    }
    angle[j]=angle[j-1]+shift*tau/bins/(after-before);
  }
  const smooth=new Float32Array(rings);
  for(let j=0;j<rings;j++) {
    let sum=0,weight=0;
    for(let d=-8;d<=8;d++){const w=9-Math.abs(d);sum+=angle[Math.max(0,Math.min(rings-1,j+d))]*w;weight+=w;}
    smooth[j]=sum/weight;
  }
  const radial=j=>minR+(maxR-minR)*j/(rings-1);
  // Continue the measured arm tangent into the origin; there is no separate
  // orbiting central disk or circular gap between the arms and nucleus.
  const innerSlope=(smooth[8]-smooth[0])/(radial(8)-minR);
  const route=[];
  for(let j=0;j<16;j++){const r=minR*j/16;route.push([r,smooth[0]+innerSlope*(r-minR)]);}
  for(let j=0;j<rings;j++)route.push([radial(j),smooth[j]]);
  // Continue beyond the square's corners. Stars do not switch to a static field
  // at the measurement circle; sparse field classification uses local density.
  const outerR=780,outerSteps=96;
  const outerSlope=(smooth[rings-1]-smooth[rings-9])/(radial(rings-1)-radial(rings-9));
  for(let j=1;j<=outerSteps;j++){const r=maxR+(outerR-maxR)*j/outerSteps;route.push([r,smooth[rings-1]+outerSlope*180*Math.log1p((r-maxR)/180)]);}
  const length=new Float32Array(route.length);
  for(let j=1;j<route.length;j++) {
    const [r,a]=route[j],[s,b]=route[j-1];
    length[j]=length[j-1]+Math.hypot(r*Math.cos(a)-s*Math.cos(b),r*Math.sin(a)-s*Math.sin(b));
  }
  const totalLength=length[length.length-1];
  for(let j=0;j<length.length;j++)length[j]/=totalLength;
  const lookup=new Float32Array(512*4);
  let at=1;
  for(let i=0;i<512;i++) {
    const p=i/511;
    while(at<route.length-1 && length[at]<p)at++;
    const f=(p-length[at-1])/(length[at]-length[at-1]);
    lookup[i*4]=(route[at-1][0]*(1-f)+route[at][0]*f)/(W/2);
    lookup[i*4+1]=route[at-1][1]*(1-f)+route[at][1]*f;
  }
  const stars=[];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++) {
    const idx=y*W+x,v=lum[idx];if(v<18)continue;
    let peak=true;
    for(let dy=-1;dy<=1&&peak;dy++)for(let dx=-1;dx<=1;dx++){
      const j=idx+dy*W+dx;
      if(j!==idx&&(lum[j]>v||(lum[j]===v&&j<idx))){peak=false;break;}
    }
    if(!peak)continue;
    let mx=0,my=0,mass=0;const flux=[0,0,0];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const j=idx+dy*W+dx,w=lum[j];mx+=(x+dx+.5)*w;my+=(y+dy+.5)*w;mass+=w;
      for(let c=0;c<3;c++)flux[c]+=rgb[j*3+c]/255;
    }
    const px=mx/mass-W/2,py=my/mass-H/2,r=Math.hypot(px,py),theta=Math.atan2(py,px);
    const ring=Math.max(0,Math.min(rings-1.000001,(r-minR)/(maxR-minR)*(rings-1)));
    const j=Math.floor(ring),f=ring-j;
    let a=smooth[j]*(1-f)+smooth[j+1]*f,p=length[j+16]*(1-f)+length[j+17]*f;
    if(r<minR){
      const q=Math.min(15.999999,r/minR*16),i=Math.floor(q),u=q-i;
      a=route[i][1]*(1-u)+route[i+1][1]*u;p=length[i]*(1-u)+length[i+1]*u;
    }else if(r>maxR){
      const q=16+rings-1+(r-maxR)/(outerR-maxR)*outerSteps,i=Math.floor(q),u=q-i;
      a=route[i][1]*(1-u)+route[i+1][1]*u;p=length[i]*(1-u)+length[i+1]*u;
    }
    // Keep sparse field stars outside the spiral as distinct, slow orbits.
    const localDensity=density(x,y);
    const mode=r>=minR&&localDensity<5.5?1:0;
    const size=.48+Math.min(.7,Math.sqrt(mass/255)*.12);
    // Different entry distances prevent a shared circular fade line. Starting
    // phase preserves the position extracted from the artwork exactly.
    const end=p+(1-p)*(.35+.65*random());
    stars.push(mode===0?p/end:p,wrap(theta-a),(.006+random()*.003)/(mode===0?end:1),size,
      flux[0],flux[1],flux[2],random()*tau,
      mode===0?end:r/(W/2),theta,mode,.04+random()*.06);
  }
  const starCount=stars.length/12;
  // A compact white nucleus and broad, faint bloom; both fade continuously.
  // Arriving stars disappear only within the white nucleus, not on a ring.
  stars.push(0,0,0,6,600,600,600,0,0,0,3,0);
  stars.push(0,0,0,23,130,130,130,0,0,0,3,0);
  assert(stars.length/12>10000);
  assert(stars.every(Number.isFinite));
  assert([...lookup].every(Number.isFinite));
  // Verify the position/phase mapping is continuous at every lookup boundary.
  let biggestStep=0;
  for(let i=1;i<512;i++){
    const r=lookup[4*i],a=lookup[4*i+1],pr=lookup[4*(i-1)],pa=lookup[4*(i-1)+1];
    biggestStep=Math.max(biggestStep,Math.hypot(r*Math.cos(a)-pr*Math.cos(pa),r*Math.sin(a)-pr*Math.sin(pa)));
  }
  assert(biggestStep<.04);
  const packed=Buffer.from(new Float32Array(stars).buffer).toString('base64');
  console.log(JSON.stringify({brand,stars:starCount,windingRadians:smooth[rings-1]-smooth[0],biggestStep,sourcePixels:W}));
  return {brand,count:stars.length/12,starCount,stars:packed,path:Buffer.from(lookup.buffer).toString('base64'),still:'data:image/png;base64,'+readFileSync(source).toString('base64')};
}
for(const brand of ['openai','anthropic']){
 const entry=prepare(brand);delete entry.still;
 writeFileSync(project+'/'+brand+'-discord-presence/public/official-galaxy-data-20261030.js',
  '/* Official galaxy artwork. By Astra. Generated from the original stars. */\nwindow.officialGalaxyData=window.officialGalaxyData||{};\nwindow.officialGalaxyData.'+brand+'='+JSON.stringify(entry)+';\n');
 copyFileSync(new URL('./official-galaxy-renderer-20261030.js',import.meta.url),project+'/'+brand+'-discord-presence/public/official-galaxy-renderer-20261030.js');
}

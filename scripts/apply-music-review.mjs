import { readFile, writeFile } from 'node:fs/promises';
import { verify, lyric } from './research-music.mjs';
const root=new URL('../src/data/music/',import.meta.url);
const path=new URL('catalog.json',root);
const d=JSON.parse(await readFile(path,'utf8'));
const blocked=JSON.parse(await readFile(new URL('blocked-videos.json',root),'utf8'));
const mappings=JSON.parse(await readFile(new URL('reviewed-mappings.json',root),'utf8'));
for(const m of mappings) {
 const t=d.tracks.find(t=>t.id===m.id);if(!t){console.log('NOT FOUND',m.id);continue;}
 const v=await verify(m.videoId);if(!v)throw new Error('Video unavailable '+m.videoId);
 if(m.title){t.alternateTitles=[...new Set([...(t.alternateTitles??[]),t.title])].filter(title=>title!==m.title);t.title=m.title;}
 t.videoId=v.videoId;t.lyrics=lyric(v.title);t.verification={...v,method:'youtube-oembed',lyricEvidence:t.lyrics?'title':null};t.availability='verified';
 if(m.note)t.recordingNote=m.note;
}
// A public church list had misattributed this LDS youth song to the Adventist album.
const excluded=d.tracks.find(t=>t.id==='jovem-2017-6');
if(excluded){d.exclusions??=[];d.exclusions.push({title:excluded.title,source:excluded.source,reason:'Atribuição ao CD Jovem adventista não confirmada; versão encontrada é Mutual 2017 (Igreja de Jesus Cristo).',evidence:'https://www.youtube.com/watch?v=JXE2bPWO7FY'});d.tracks=d.tracks.filter(t=>t!==excluded);}
for(const c of d.collections)if(c.id.startsWith('jovem-')&&c.year>=2016&&/^jovem-\d+$/.test(c.id))c.inventoryScope='annual-selection';
if(!d.tracks.some(t=>t.videoId==='GsJR4rRldgo')){
 const v=await verify('GsJR4rRldgo');if(v)d.tracks.push({id:'novo-tom-live',title:'O Melhor Lugar do Mundo (Ao Vivo)',collectionId:'selecao-novo-tom',tags:['Adoração'],source:v.source,videoId:v.videoId,lyrics:false,availability:'verified',verification:{...v,method:'youtube-oembed',lyricEvidence:null}});
}
for(const t of d.tracks)if(blocked.videoIds.includes(t.videoId)||blocked.videoIds.includes(t.rejectedVideo?.videoId)){
 t.rejectedVideo=t.verification??t.rejectedVideo;
 delete t.videoId;delete t.verification;
 t.lyrics=false;t.availability='unmapped';t.recordingNote=blocked.reason;
}
// Annual selections now point to the reviewed Portuguese official upload.
for(const year of [2023,2025]){
 const c=d.collections.find(c=>c.id===`jovem-${year}`);
 const t=d.tracks.find(t=>t.collectionId===c?.id);
 if(c&&t?.verification)c.source=t.verification.source;
}
await writeFile(path,JSON.stringify(d,null,2)+'\n');

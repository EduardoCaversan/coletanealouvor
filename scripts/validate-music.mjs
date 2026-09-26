import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('src/data/music/catalog.json',root),'utf8'));
const blocked=JSON.parse(await readFile(new URL('src/data/music/blocked-videos.json',root),'utf8'));
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const collections=new Map(data.collections.map(c=>[c.id,c]));
assert.equal(collections.size,data.collections.length,'Duplicate collection IDs');
assert.equal(new Set(data.tracks.map(t=>t.id)).size,data.tracks.length,'Duplicate track IDs');
const titles=new Set(),videos=new Set(),positions=new Set();
for(const t of data.tracks) {
 assert(t.title?.trim()&&t.source&&collections.has(t.collectionId),`Missing metadata ${t.id}`);
 assert(!titles.has(t.collectionId+norm(t.title)),`Duplicate title ${t.id}`);titles.add(t.collectionId+norm(t.title));
 assert(Array.isArray(t.tags),`Tags missing ${t.id}`);
 if(t.track){assert(Number.isInteger(t.track)&&t.track>0,`Track number ${t.id}`);assert(!positions.has(t.collectionId+':'+t.track),`Duplicate track number ${t.id}`);positions.add(t.collectionId+':'+t.track);}
 if(t.videoId) {
  assert(!blocked.videoIds.includes(t.videoId),`Known embedding restriction ${t.id}`);
  assert(/^[\w-]{11}$/.test(t.videoId),`Invalid video ID ${t.id}`);
  assert.equal(t.verification?.videoId,t.videoId,`No verification ${t.id}`);
  assert(t.verification.title&&t.verification.publisher&&t.verification.checkedAt,`Incomplete verification ${t.id}`);
  assert(!videos.has(t.collectionId+':'+t.videoId),`Duplicate mapping within collection ${t.id}`);videos.add(t.collectionId+':'+t.videoId);
  assert.equal(t.availability,'verified',`Availability ${t.id}`);
  if(t.lyrics)assert(t.verification.lyricEvidence,`No lyric evidence ${t.id}`);
 } else assert.equal(t.availability,'unmapped',`Missing availability ${t.id}`);
}
const count=ts=>({tracks:ts.length,lyrics:ts.filter(t=>t.videoId&&t.lyrics).length,fallbacks:ts.filter(t=>t.videoId&&!t.lyrics).length,missing:ts.filter(t=>!t.videoId).length});
const groups=Object.fromEntries(['youth','collections','children','offering','other','instrumental'].map(group=>{const cs=data.collections.filter(c=>c.group===group);return [group,{collections:cs.length,...count(data.tracks.filter(t=>collections.get(t.collectionId).group===group))}]}));
const stats={collections:data.collections.length,...count(data.tracks),uniqueVideos:new Set(data.tracks.map(t=>t.videoId).filter(Boolean)).size,groups};
console.log(JSON.stringify(stats,null,2));
if(process.argv.includes('--report')) {
 const lines=['# Inventário da biblioteca musical','',`Atualizado: ${data.researchedAt}. Estatísticas geradas por \`node scripts/validate-music.mjs --report\`.`,
 '',`Total: **${stats.tracks} faixas**, **${stats.collections} coleções/seleções**, **${stats.lyrics} com indicação de letra**, **${stats.fallbacks} fallbacks**, **${stats.missing} sem vídeo**, **${stats.uniqueVideos} IDs únicos**.`,
 '', '“Com letra” significa indicação explícita no título do vídeo conferido no YouTube (ou inspeção visual registrada). Não significa que todos os vídeos foram assistidos integralmente. A verificação de existência/título usa oEmbed do YouTube, com data, título, canal e URL em cada registro. Reprodução incorporada, disponibilidade regional, anúncios e remoções podem mudar; confira antes do culto.',
 '', 'O inventário cobre as faixas identificadas nas fontes vinculadas, não afirma esgotar toda a música adventista. Listas de uma igreja podem ser seleções, não discografias oficiais completas. Anos recentes incluem temas anuais, não necessariamente CDs. Faixas adicionais e grafias alternativas das fontes foram reconciliadas. Numeração é exibida apenas quando conhecida; diferenças de edição podem existir.',
 '', '## Por categoria','', '| Categoria | Coleções | Faixas | Letra | Fallback | Sem vídeo |','|---|---:|---:|---:|---:|---:|'];
 for(const [group,s] of Object.entries(groups))lines.push(`| ${group} | ${s.collections} | ${s.tracks} | ${s.lyrics} | ${s.fallbacks} | ${s.missing} |`);
 lines.push('','## Por coleção','','| Coleção / fonte | Escopo | Faixas identificadas | Letra | Fallback | Sem vídeo |','|---|---|---:|---:|---:|---:|');
 for(const c of [...data.collections].sort((a,b)=>a.group.localeCompare(b.group)||(a.year??9999)-(b.year??9999)||a.title.localeCompare(b.title))){const s=count(data.tracks.filter(t=>t.collectionId===c.id));lines.push(`| [${c.title.replaceAll('|','/')}](${c.source}) | ${c.inventoryScope??'selection'} | ${s.tracks} | ${s.lyrics} | ${s.fallbacks} | ${s.missing} |`);}
 lines.push('','## Mapeamentos ainda ausentes','');
 for(const c of data.collections){const missing=data.tracks.filter(t=>t.collectionId===c.id&&!t.videoId);if(missing.length)lines.push(`- **${c.title}**: ${missing.map(t=>t.title).join('; ')}.`);}
 lines.push('','## Limites conhecidos','', '- As fontes de inventário são o catálogo público da IASD Ermelinda, discografias do Cifra Club e metadados publicados pelo YouTube. Erros tipográficos das fontes foram corrigidos sem copiar letras ou mídia.', '- Biblioteca infantil inclui também músicas educativas adventistas; o operador escolhe as apropriadas à reunião.', '- Categorias de uso (ofertas, oração, dedicação) são curadoria operacional, não uma afirmação de que todas as faixas pertencem a um álbum oficial com esse nome.', '- Pesquisas, preferências por letra e correspondência com coleção são registradas no código de pesquisa; cache local ignorado pelo Git evita repetir consultas. O comando inventory recusa sobrescrever dados existentes.');
 for(const e of data.exclusions??[])lines.push(`- Excluído: **${e.title}**. ${e.reason} [Evidência](${e.evidence}).`);
 lines.push(`- ${blocked.videoIds.length} vídeos com bloqueio de incorporação observado estão registrados em \`src/data/music/blocked-videos.json\` e não podem voltar ao catálogo sem revisão. “Meu Pastor” (Adoradores 4) permanece listado, mas indisponível, após falha da versão oficial e das alternativas testadas.`);
 await mkdir(new URL('docs/',root),{recursive:true});
 await writeFile(new URL('docs/music-library-status.md',root),lines.join('\n')+'\n');
 await writeFile(new URL('src/data/music/stats.json',root),JSON.stringify(stats,null,2)+'\n');
}

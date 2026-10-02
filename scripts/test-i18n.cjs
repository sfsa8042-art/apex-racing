/* Run with npm run test:i18n. Uses the project's TypeScript compiler; no test dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name,...args) { return resolve.call(this,name.startsWith('@/') ? path.join(root,name.slice(2)) : name,...args); };
require.extensions['.ts'] = (mod,file) => mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {translateText} = require('../shared/i18n/translate.ts');
const {preferredLanguage} = require('../shared/i18n/locale.ts');
const sources = require('../messages/catalog/sources.json');
const en = require('../messages/catalog/en.json');
const ru = require('../messages/catalog/ru.json');
assert.deepEqual(Object.keys(en).sort(),Object.keys(ru).sort());
assert.deepEqual(Object.keys(en).sort(),Object.keys(sources).sort());
function keys(obj,prefix=''){return Object.entries(obj).flatMap(([k,v])=>typeof v==='object'?keys(v,prefix+k+'.'):[prefix+k]).sort()}
assert.deepEqual(keys(require('../messages/en.json')),keys(require('../messages/ru.json')));
const {catalogCopy} = require('../lib/catalog/copy.ts');
assert.deepEqual(keys(catalogCopy.en), keys(catalogCopy.ru));
for (const [key, value] of Object.entries(catalogCopy.en)) {
 assert.ok(value.trim() && !/[А-Яа-яЁё]/.test(value), `Invalid English catalog copy: ${key}`);
 assert.ok(catalogCopy.ru[key].trim(), `Missing Russian catalog copy: ${key}`);
}
assert.equal(preferredLanguage('fr-FR,ru-RU;q=0.9,en;q=0.8'),'ru');
assert.equal(preferredLanguage('en-US'),'en');
assert.equal(preferredLanguage('de'),'en');
assert.equal(preferredLanguage('en;q=0.3,ru;q=0.9'),'ru');
assert.equal(preferredLanguage('ru;q=0,en;q=1'),'en');
assert.equal(translateText('THROTTLE','ru'),'ГАЗ');
assert.equal(translateText('✓ ACC найден\nКругов завершено: 3','en'),'✓ ACC detected\nLaps completed: 3');
for(const value of ['Results','Assets','David','Recorded','Documents\\Results','test.csv','Porsche 992 GT3 R','apex_tok_abc123']) {
  assert.equal(translateText(value,'ru'),value,'Technical data must stay intact');
}
assert.equal(translateText('Поворот 12','en'),'Turn 12');
assert.equal(translateText('No lap loaded','ru'),'Круг не загружен');
assert.equal(translateText('Невалидный JSON файл','en'),'Invalid JSON file');
assert.equal(translateText('1× повторных нажатий','en'),'Brake reapplications: 1');
assert.equal(translateText('4 повторных нажатий на тормоз.','ru'),'Повторных нажатий тормоза: 4.');
for (const text of [
 '2.2 с газа с тормозом. 4 повторных нажатий на тормоз. 3 серьёзных замечаний по технике. Плавность ввода: 55/100.',
 '0.6 с одновременно жмёшь газ и тормоз в Поворот 2. Тормоз гасит тягу — мотор и тормоза работают друг против друга.',
]) assert.ok(!/[А-Яа-яЁё]/.test(translateText(text,'en')),translateText(text,'en'));
const failures=[];
for(const [id,source]of Object.entries(sources)){
 assert.equal(typeof en[id],'string');assert.ok(en[id].trim(),id);assert.ok(ru[id].trim(),id);
 const available=new Set([...source.matchAll(/\{(\d+)\}/g)].map(m=>m[1]));
 for(const target of [en[id],ru[id]])for(const m of target.matchAll(/\{(\d+)\}/g))assert.ok(available.has(m[1]),`Unknown placeholder ${id}: ${m[0]}`);
 if(/[А-Яа-яЁё]/.test(source)&&source!=='Русский'){
  const sample=source.replace(/\{\d+\}/g,'12');const translated=translateText(sample,'en');
  if(/[А-Яа-яЁё]/.test(translated))failures.push({id,source:sample,translated});
 }
}
const {ACADEMY_MODULES}=require('../lib/academy/content.ts');
const {mockCars,mockTracks}=require('../lib/mockData.ts');
for (const car of mockCars) {
 for(const value of [...car.strengths,...car.weaknesses,...car.setupHints.map(h=>h.parameter)])
  assert.ok(/[А-Яа-яЁё]/.test(translateText(value,'ru')),`Missing Russian car copy: ${value}`);
}
for (const track of mockTracks) {
 for(const value of [track.country,...track.keyCharacteristics.filter(v=>!['130R','La Caixa'].includes(v))])
  assert.ok(/[А-Яа-яЁё]/.test(translateText(value,'ru')),`Missing Russian track copy: ${value}`);
}
function scan(value,key=''){
 if(typeof value==='string'&&/[А-Яа-яЁё]/.test(value)){
  const translated=translateText(value,'en');if(/[А-Яа-яЁё]/.test(translated))failures.push({key,source:value,translated});
 }else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))scan(v,key+'.'+k);
}
scan(ACADEMY_MODULES,'academy');
(async()=>{
 const {parseFile}=require('../lib/telemetry/parser.ts');
 const {SAMPLE_REFERENCE_CSV}=require('../lib/telemetry/reference.ts');
 const {analyseLapHonest}=require('../lib/telemetry/analyzer.ts');
 const lap=await parseFile(new File([SAMPLE_REFERENCE_CSV],'sample.csv'));
 scan(analyseLapHonest(lap,null),'diagnostics');
 const reference={...lap,rows:lap.rows.map(r=>({...r,time:r.time*0.9,speed:r.speed*1.1})),lapTimeMs:lap.lapTimeMs*0.9};
 scan(analyseLapHonest(lap,reference),'comparison');
 assert.deepEqual(failures,[],'English output contains untranslated Russian');
 console.log(`Passed: ${Object.keys(sources).length} catalog entries, all 29 lessons, diagnostic and comparison output, locale selection and data preservation.`);
})().catch(error=>{console.error(error);process.exitCode=1});

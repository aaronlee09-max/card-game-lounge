import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const langs=JSON.parse(readFileSync('dist/profile-languages.json'));
const keys=Object.keys(JSON.parse(readFileSync('dist/locales/ko.json'))).sort();
for(const [code] of langs){
 const d=JSON.parse(readFileSync('dist/locales/'+code+'.json'));
 assert.deepEqual(Object.keys(d).sort(),keys,code+' catalog keys');
 for(const key of keys){
  const value=d[key];
  assert.ok(typeof value==='string'&&value.trim(),code+' empty: '+key);
  assert.deepEqual((value.match(/\{\w+\}/g)||[]).sort(),(key.match(/\{\w+\}/g)||[]).sort(),code+' placeholders: '+key);
  if(code!=='ko')assert.doesNotMatch(value,/[가-힣]/,code+' untranslated: '+key);
 }
}
console.log(langs.length+' languages, '+keys.length+' messages each: no missing entries, placeholder mismatches or untranslated Korean.');

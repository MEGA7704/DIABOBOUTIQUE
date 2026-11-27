import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/gestion.html',import.meta.url),'utf8');
const fn=new Function(html.slice(html.indexOf('function restoreDeletedSale('),html.indexOf('const selectedSales='))+';return restoreDeletedSale')();
const data={products:[{id:'p',type:'Produit',stock:3}],sales:[{id:'s',number:'F1',lines:[{type:'Produit',productId:'p',qty:2},{type:'Produit',productId:'p',qty:1},{type:'Service',qty:1}],payments:[{amount:10}]}]};
fn(data,'s',()=> 'm','2026-11-27');assert.equal(data.products[0].stock,6);assert.equal(data.sales.length,0);assert.equal(data.stockMovements.length,1);assert.throws(()=>fn(data,'s',()=> 'm',''));assert.equal(data.products[0].stock,6);
for(const extra of [{onlineOrder:true},{cancelled:true},{}]){const d={products:[{id:'p',type:'Produit',stock:3}],sales:[{id:'s',lines:[{type:'Produit',productId:'p',qty:1},{type:'Produit',productId:'missing',qty:1}],...extra}]};assert.throws(()=>fn(d,'s',()=> 'm',''));assert.equal(d.products[0].stock,3);assert.equal(d.sales.length,1)}
console.log('Suppression vente : stock, doublons, protections et validation OK');

const batch=new Function(html.slice(html.indexOf('function restoreDeletedSale('),html.indexOf('function updateSaleSelection('))+';return restoreDeletedSales')();
const original={products:[{id:'p',type:'Produit',stock:3}],sales:[{id:'a',lines:[{type:'Produit',productId:'p',qty:2}]},{id:'b',lines:[{type:'Produit',productId:'p',qty:3}]}]};const result=batch(original,['a','b','a'],()=> 'm','');assert.equal(result.draft.products[0].stock,8);assert.equal(result.draft.sales.length,0);assert.equal(original.products[0].stock,3);assert.throws(()=>batch(original,['a','missing'],()=> 'm',''));assert.equal(original.sales.length,2);console.log('Suppression groupée atomique sur copie : OK');

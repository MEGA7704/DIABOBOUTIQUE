import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/gestion.html',import.meta.url),'utf8');
const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
const fields=Object.fromEntries(['type','cost','stock','minStock','price','generalRate','marginRate','serviceFee','published'].map(k=>[k,{}]));el('productForm').elements=fields;
const source=html.slice(html.indexOf('const servicePriceLabels='),html.indexOf('function syncServiceFee()'));
const ctx=vm.createContext({document:{getElementById:el}});vm.runInContext(source,ctx);const sync=()=>vm.runInContext('syncServicePricing()',ctx);
fields.type.value='Service';
for(const mode of ['À l’unité','À l’heure','À la journée','À la semaine','Au mois','À l’année','Au forfait','Au kilomètre','Au m²','__custom__']){el('billingMode').value=mode;sync();assert.equal(fields.stock.disabled,true);assert.equal(fields.minStock.disabled,true);assert.equal(fields.price.disabled,false);assert.equal(fields.marginRate.disabled,false);assert.equal(fields.generalRate.disabled,true);assert.equal(fields.published.disabled,false);}
el('billingMode').value='À l’année';sync();assert.match(el('productPriceLabel').textContent,/Prix du mois/);
el('billingMode').value='Au pourcentage';sync();assert.equal(fields.price.disabled,true);assert.equal(fields.generalRate.disabled,false);assert.equal(fields.marginRate.disabled,false);assert.equal(fields.published.disabled,true);
el('billingMode').value='Sur devis';sync();for(const k of ['price','generalRate','marginRate','serviceFee','cost','stock','minStock'])assert.equal(fields[k].disabled,true,k);
fields.type.value='Produit';sync();for(const k of ['price','cost','stock','minStock'])assert.equal(fields[k].disabled,false,k);assert.equal(fields.marginRate.disabled,true);
console.log('OK — champs conditionnels pour tous les modes de facturation.');

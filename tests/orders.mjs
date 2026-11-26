import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../public/_worker.js';
const sql=new DatabaseSync(':memory:');for(const name of ['0001_initial.sql','0002_client_orders.sql','0003_delivery.sql','0004_payment_declaration.sql'])sql.exec(fs.readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const stmt=(s,args=[])=>({bind:(...a)=>stmt(s,a),first:async()=>sql.prepare(s).get(...args)||null,all:async()=>({results:sql.prepare(s).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(s).run(...args).changes)}})});
const DB={prepare:s=>stmt(s),batch:async ss=>{sql.exec('BEGIN');try{const results=[];for(const st of ss)results.push(await st.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
const origin='https://test.example',env={DB};
async function req(path,b,session){const headers={Origin:origin};if(session){headers.Cookie=session.cookie;headers['X-CSRF']=session.csrf||''}if(b!==undefined)headers['Content-Type']='application/json';const r=await worker.fetch(new Request(origin+'/api/'+path,{method:b===undefined?'GET':'POST',headers,body:b===undefined?undefined:JSON.stringify(b)}),env);return {status:r.status,body:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]}}
async function ok(path,b,s){const r=await req(path,b,s);assert.ok(r.status<300,JSON.stringify(r));return r.body}
async function account(email,type){await ok('register',{email,password:'Motdepasse123',name:email,phone:'0700000000',location:'Diabo',type});const r=await req('login',{email,password:'Motdepasse123'});assert.equal(r.status,200);const s={cookie:r.cookie};const me=await ok('me',undefined,s);return {...s,...me}}
const c=await account('client@test.ci','client'),c2=await account('other@test.ci','client'),a=await account('a@test.ci','shop'),b=await account('b@test.ci','shop');
const base={company:{name:'Boutique'},counter:{client:0,sale:0},clients:[],sales:[],expenses:[],products:[{id:'p1',name:'Article',type:'Produit',price:500,cost:200,stock:5,published:true}]};
for(const s of [a,b])await ok('save',{version:0,data:base},s);
let state=await ok('client/state',undefined,c);assert.equal(state.profile.name,'client@test.ci');
async function update(body){await ok('client/update',{...body,version:state.version},c);state=await ok('client/state',undefined,c)}
await update({kind:'delivery',name:'Client',phone:'0700000000',location:'Diabo',address:'Marché'});
const ida=a.shop.id+'-p1',idb=b.shop.id+'-p1';await update({kind:'cart',id:ida,qty:2});await update({kind:'cart',id:idb,qty:1});await update({kind:'favorite',id:ida});assert.equal(state.favorites[0],ida);
await ok('shop/delivery',{city:'Diabo',districts:['Marché'],cities:['Bouaké'],methods:[{name:'Car',fee:200}],wave:'',usdt:'',whatsapp:'+225 07 00 00 00 00'},a);
assert.equal((await ok('shop/delivery',undefined,a)).whatsapp,'2250700000000');
assert.equal((await req('shop/delivery',{city:'Diabo',districts:[],cities:[],methods:[],whatsapp:'invalid'},a)).status,400);
const payload={version:state.version,prices:{[ida]:500,[idb]:500},choices:{[a.shop.id]:{mode:'local',city:'Diabo',district:'Marché'},[b.shop.id]:{mode:'pickup'}},totals:{[a.shop.id]:1100,[b.shop.id]:500}};const quote=await ok('client/quote',payload,c);assert.equal(quote.find(x=>x.shop===a.shop.id).fee,100);const checkout=await ok('client/checkout',payload,c);assert.equal(checkout.orders,2);assert.equal((await req('client/checkout',payload,c)).status,409);assert.equal((await ok('client/orders',undefined,c2)).length,0);
const orders=await ok('client/orders',undefined,c);assert.equal(orders.length,2);assert.ok(orders.every(o=>o.status==='pending'));const ao=(await ok('shop/orders',undefined,a))[0],bo=(await ok('shop/orders',undefined,b))[0];assert.equal(orders.find(o=>o.id===ao.id).whatsapp,'2250700000000');assert.equal(orders.find(o=>o.id===bo.id).whatsapp,'');assert.equal(ao.total,1100);assert.equal(bo.total,500);assert.equal((await req('shop/orders/status',{id:bo.id,status:'accepted'},a)).status,404);assert.equal((await req('shop/orders',undefined,c)).status,403);
let load=await ok('load',undefined,a);assert.equal(load.data.sales.length,0);assert.equal(load.data.products[0].stock,5);
const payment={id:ao.id,method:'Espèces',reference:'RECU001',amount:1100};assert.equal((await req('shop/orders/pay',payment,a)).status,409);await ok('shop/orders/status',{id:ao.id,status:'accepted'},a);assert.equal((await ok('load',undefined,a)).data.sales.length,0);assert.equal((await req('shop/orders/pay',payment,a)).status,409);assert.equal((await req('shop/orders/pay',{...payment,amount:999},a)).status,409);assert.equal((await req('client/orders/declare',{...payment},c2)).status,404);await ok('client/orders/declare',payment,c);let declared=(await ok('shop/orders',undefined,a))[0].declaration;assert.equal(declared.reference,payment.reference);assert.equal((await ok('load',undefined,a)).data.sales.length,0);assert.equal((await req('client/orders/declare',payment,c)).status,409);await ok('shop/orders/payment-reject',{id:ao.id,reason:'Non reçu'},a);assert.equal((await ok('client/orders',undefined,c)).find(o=>o.id===ao.id).payment_notice,'Non reçu');await ok('client/orders/declare',payment,c);declared=(await ok('shop/orders',undefined,a))[0].declaration;assert.equal((await req('shop/orders/pay',payment,a)).status,409);assert.equal((await req('shop/orders/pay',{...payment,declarationId:declared.id,reference:'AUTRE-REF'},a)).status,409);assert.equal((await req('shop/orders/pay',{...payment,declarationId:declared.id,amount:999},a)).status,400);await ok('shop/orders/pay',{...payment,declarationId:declared.id},a);assert.equal((await req('shop/orders/pay',payment,a)).status,409);
load=await ok('load',undefined,a);assert.equal(load.data.sales.length,1);assert.equal(load.data.sales[0].total,1100);assert.equal(load.data.sales[0].payments[0].amount,1100);assert.equal(load.data.products[0].stock,3);assert.equal((await ok('catalog')).find(x=>x.id===ida).stock,3);assert.equal((await ok('load',undefined,b)).data.sales.length,0);assert.equal((await ok('client/orders',undefined,c)).filter(o=>o.status==='paid').length,1);assert.equal((await ok('client/orders',undefined,c)).find(o=>o.id===ao.id).whatsapp,'');
await ok('save',{version:load.version,data:load.data},a);const after=await ok('load',undefined,a);after.data.sales=[];assert.equal((await req('save',{version:after.version,data:after.data},a)).status,409);
await ok('shop/orders/status',{id:bo.id,status:'rejected'},b);assert.equal((await req('shop/orders/pay',{...payment,id:bo.id,amount:500},b)).status,409);
assert.equal((await req('password',{current:'wrong',password:'Newpassword123'},c)).status,403);await ok('password',{current:'Motdepasse123',password:'Newpassword123'},c);assert.equal((await req('client/state',undefined,c)).status,401);
console.log('OK — inscription, panier multi-boutiques, isolation, validation, paiement unique, stocks, vente, refus, mot de passe.');

const {localFee,deliveryFee}=await import('../public/_worker.js');for(const [n,f] of [[0,0],[5,1],[4999,500],[5000,250],[24999,1250],[25000,500],[99999,2000],[100000,1500]])assert.equal(localFee(n),f);const config={city:'Diabo',districts:['Marché'],cities:['Bouaké'],methods:[{name:'Car',fee:700}]};assert.equal(deliveryFee(config,100000,{mode:'shipping',city:'Bouaké',method:'Car'}).fee,700);assert.equal(deliveryFee(config,100000,{mode:'pickup'}).fee,0);assert.throws(()=>deliveryFee(config,100000,{mode:'shipping',city:'Diabo',method:'Car'}));console.log('OK — barèmes, retrait, expédition, contrôle local.');

const feeSale=(await ok('load',undefined,a)).data.sales.find(s=>s.id===ao.id);
assert.equal(feeSale.lines.find(l=>l.productId==='delivery-fee').cost,100);
assert.equal(feeSale.total-feeSale.lines.reduce((sum,l)=>sum+l.qty*l.cost,0),600);
console.log('Frais de livraison neutralisés dans la marge.');

// Une prestation de 10 000 F + 500 F de frais par unité : les frais ne supportent aucun coût direct.
let serviceLoad=await ok('load',undefined,a);
serviceLoad.data.products.push({id:'svc1',name:'Assistance',type:'Service',price:10000,cost:7000,marginRate:30,serviceFee:500,billingMode:'Au forfait',stock:0,published:true});
await ok('save',{version:serviceLoad.version,data:serviceLoad.data},a);
const svcId=a.shop.id+'-svc1';
assert.equal((await ok('catalog')).find(x=>x.id===svcId).price,10500);
let state2=await ok('client/state',undefined,c2);
await ok('client/update',{kind:'delivery',name:'Client 2',phone:'0700000000',location:'Diabo',address:'Marché',version:state2.version},c2);
state2=await ok('client/state',undefined,c2);
await ok('client/update',{kind:'cart',id:svcId,qty:2,version:state2.version},c2);
state2=await ok('client/state',undefined,c2);
const svcPayload={version:state2.version,prices:{[svcId]:10500},choices:{[a.shop.id]:{mode:'pickup'}},totals:{[a.shop.id]:21000}};
await ok('client/checkout',svcPayload,c2);
const svcOrder=(await ok('client/orders',undefined,c2))[0];
assert.equal(svcOrder.lines[0].serviceFee,500);
// Modification du tarif après commande : le montant des frais convenus reste figé.
serviceLoad=await ok('load',undefined,a);serviceLoad.data.products.find(x=>x.id==='svc1').serviceFee=900;await ok('save',{version:serviceLoad.version,data:serviceLoad.data},a);
await ok('shop/orders/status',{id:svcOrder.id,status:'accepted'},a);
const svcPay={id:svcOrder.id,method:'Espèces',reference:'SERVICE-001',amount:21000};await ok('client/orders/declare',svcPay,c2);
const svcDecl=(await ok('shop/orders',undefined,a)).find(x=>x.id===svcOrder.id).declaration;
await ok('shop/orders/pay',{...svcPay,declarationId:svcDecl.id},a);
const svcSale=(await ok('load',undefined,a)).data.sales.find(x=>x.id===svcOrder.id);
assert.equal(svcSale.lines[0].serviceFee,500);assert.equal(svcSale.lines[0].cost,7000);assert.equal(svcSale.total,21000);assert.equal(svcSale.total-svcSale.lines[0].qty*svcSale.lines[0].cost,7000);
console.log('OK — frais de service publics, facturation, marge et conservation du tarif commandé.');

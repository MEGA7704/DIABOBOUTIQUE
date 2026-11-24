import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../public/_worker.js';
const sql=new DatabaseSync(':memory:');for(const name of ['0001_initial.sql','0002_client_orders.sql'])sql.exec(fs.readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
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
const payload={version:state.version,prices:{[ida]:500,[idb]:500}};const checkout=await ok('client/checkout',payload,c);assert.equal(checkout.orders,2);assert.equal((await req('client/checkout',payload,c)).status,409);assert.equal((await ok('client/orders',undefined,c2)).length,0);
const orders=await ok('client/orders',undefined,c);assert.equal(orders.length,2);assert.ok(orders.every(o=>o.status==='pending'));const ao=(await ok('shop/orders',undefined,a))[0],bo=(await ok('shop/orders',undefined,b))[0];assert.equal(ao.total,1000);assert.equal(bo.total,500);assert.equal((await req('shop/orders/status',{id:bo.id,status:'accepted'},a)).status,404);assert.equal((await req('shop/orders',undefined,c)).status,403);
let load=await ok('load',undefined,a);assert.equal(load.data.sales.length,0);assert.equal(load.data.products[0].stock,5);
const payment={id:ao.id,method:'Espèces',reference:'RECU001',amount:1000};assert.equal((await req('shop/orders/pay',payment,a)).status,409);await ok('shop/orders/status',{id:ao.id,status:'accepted'},a);assert.equal((await ok('load',undefined,a)).data.sales.length,0);assert.equal((await req('shop/orders/pay',{...payment,amount:999},a)).status,400);await ok('shop/orders/pay',payment,a);assert.equal((await req('shop/orders/pay',payment,a)).status,409);
load=await ok('load',undefined,a);assert.equal(load.data.sales.length,1);assert.equal(load.data.sales[0].total,1000);assert.equal(load.data.sales[0].payments[0].amount,1000);assert.equal(load.data.products[0].stock,3);assert.equal((await ok('catalog')).find(x=>x.id===ida).stock,3);assert.equal((await ok('load',undefined,b)).data.sales.length,0);assert.equal((await ok('client/orders',undefined,c)).filter(o=>o.status==='paid').length,1);
await ok('save',{version:load.version,data:load.data},a);const after=await ok('load',undefined,a);after.data.sales=[];assert.equal((await req('save',{version:after.version,data:after.data},a)).status,409);
await ok('shop/orders/status',{id:bo.id,status:'rejected'},b);assert.equal((await req('shop/orders/pay',{...payment,id:bo.id,amount:500},b)).status,409);
assert.equal((await req('password',{current:'wrong',password:'Newpassword123'},c)).status,403);await ok('password',{current:'Motdepasse123',password:'Newpassword123'},c);assert.equal((await req('client/state',undefined,c)).status,401);
console.log('OK — inscription, panier multi-boutiques, isolation, validation, paiement unique, stocks, vente, refus, mot de passe.');

import assert from 'node:assert/strict';
import { buildResult, findMatrixItem, matrixItems } from '../lib/engine.mjs';

let passed=0;
function test(name,fn){try{fn();passed++;console.log('✓',name)}catch(e){console.error('✗',name);throw e}}
function item(display_name,matrix_key,{g=null,count=null,cat=null,exact=true,sp=null}={}){return {display_name,matrix_key,primary_category:cat,estimated_grams:g,estimated_count:count,estimated_spoonies:sp,amount_text:'',confidence:'high',exact,note:''}}
function result(items,mealType='main',source='text'){return buildResult({detectedItems:items,mealType,source,aiFollowUps:[],uncertainties:[]})}
function cat(r,label){return r.categories.find(x=>x.label===label)}

test('Matrix has 214 entries',()=>assert.equal(matrixItems.length,214));
test('Egg alias resolves',()=>assert.equal(findMatrixItem('Rührei')?.name,'Ei'));
test('High-protein pasta stays carbs',()=>assert.equal(findMatrixItem('High-Protein-Pasta')?.category,'Carbs'));
test('Champignons stay plants',()=>assert.equal(findMatrixItem('Champignons')?.category,'Plants'));
test('Guacamole resolves to avocado/fat',()=>assert.equal(findMatrixItem('Guacamole')?.category,'Fat'));
test('Baked beans resolve primarily protein',()=>assert.equal(findMatrixItem('Baked Beans')?.category,'Protein'));

test('Two exact eggs = 2 protein Spoonies without ca.',()=>{const r=result([item('Eier','Ei',{count:2})]);assert.equal(cat(r,'Protein').spoons,2);assert.equal(cat(r,'Protein').amountLabel,'2 Spoonies')});
test('Two photographed eggs = ca. 2 protein Spoonies',()=>{const r=result([item('Eier','Ei',{count:2,exact:false})],'breakfast','photo');assert.equal(cat(r,'Protein').amountLabel,'ca. 2 Spoonies')});
test('200g broccoli = 4 Plants',()=>{const r=result([item('Brokkoli','Brokkoli',{g:200})]);assert.equal(cat(r,'Plants').spoons,4)});
test('150g potatoes = 2 Carbs',()=>{const r=result([item('Kartoffeln','Kartoffeln',{g:150})]);assert.equal(cat(r,'Carbs').spoons,2)});
test('10g olive oil = 2 Teaspoonies',()=>{const r=result([item('Olivenöl','Olivenöl',{g:10})]);assert.equal(cat(r,'Fat').spoons,2)});
test('20g walnuts = 2 Teaspoonies',()=>{const r=result([item('Walnüsse','Walnüsse',{g:20})]);assert.equal(cat(r,'Fat').spoons,2)});
test('One bread roll = 2 Carbs',()=>{const r=result([item('Brötchen','Brötchen',{count:1})]);assert.equal(cat(r,'Carbs').spoons,2)});
test('One apple = 2 Plants',()=>{const r=result([item('Apfel','Apfel',{count:1})],'snack');assert.equal(cat(r,'Plants').spoons,2)});

test('Breakfast with tomato but enough protein recommends Plants',()=>{const r=result([item('Rührei','Ei',{count:2}),item('Tomate','Tomate',{g:70}),item('Toast','Toast',{count:2}),item('Baked Beans','Kidneybohnen',{g:80})],'breakfast','photo');assert.equal(r.recommendationType,'plants')});
test('Pasta + mushrooms + walnuts with no clear protein recommends protein',()=>{const r=result([item('Pasta','Nudeln',{g:180}),item('Champignons','Champignons',{g:150}),item('Walnüsse','Walnüsse',{g:20})]);assert.equal(r.recommendationType,'protein')});
test('Steak, broccoli, potatoes is allowed to pass',()=>{const r=result([item('Steak','Rindersteak',{g:120}),item('Brokkoli','Brokkoli',{g:200}),item('Kartoffeln','Kartoffeln',{g:150})]);assert.equal(r.recommendationType,'ok')});
test('Burger-style meal with little Plants recommends Plants, not more protein',()=>{const r=result([item('Patty','Rindersteak',{g:120}),item('Bun','Brötchen',{count:1}),item('Salat','Blattsalat',{g:15}),item('Tomate','Tomate',{g:20}),item('Pommes',null,{g:150,cat:'Carbs'})]);assert.equal(r.recommendationType,'plants')});
test('Quesadilla-style meal with beans + little tomato recommends Plants',()=>{const r=result([item('Bohnen','Schwarze Bohnen',{g:120}),item('Tortilla',null,{g:120,cat:'Carbs'}),item('Tomate','Tomate',{g:50}),item('Guacamole','Avocado',{g:50})]);assert.equal(r.recommendationType,'plants')});
test('Moussaka + big Greek salad can pass',()=>{const r=result([item('Hack','Rindersteak',{g:80}),item('Gemüse','Gemüsemix',{g:180}),item('Kartoffeln','Kartoffeln',{g:100}),item('Feta','Feta',{g:20})]);assert.equal(r.recommendationType,'ok')});
test('High-protein pasta is never counted as Protein when matrix key is Nudeln',()=>{const r=result([item('High-Protein-Pasta','Nudeln',{g:150}),item('Veganes Hack','Tofu natur',{g:120}),item('Tomaten','Tomate',{g:160})]);assert.equal(cat(r,'Carbs').spoons,3);assert.equal(cat(r,'Protein').spoons,2.5)});
test('Avocado is not double-counted as Plants',()=>{const r=result([item('Avocado','Avocado',{g:60})]);assert.equal(cat(r,'Fat').spoons,2);assert.equal(cat(r,'Plants').spoons,0)});
test('Feta is not double-counted as Protein',()=>{const r=result([item('Feta','Feta',{g:30})]);assert.equal(cat(r,'Fat').spoons,3);assert.equal(cat(r,'Protein').spoons,0)});
test('Corn stays Carbs',()=>{const r=result([item('Mais','Mais',{g:100})]);assert.equal(cat(r,'Carbs').spoons,2);assert.equal(cat(r,'Plants').spoons,0)});
test('Unknown visible vegetable can still use category fallback',()=>{const r=result([item('Romanesco',null,{g:150,cat:'Plants'})]);assert.equal(cat(r,'Plants').spoons,3)});
test('Unknown fries can still use carb fallback',()=>{const r=result([item('Pommes',null,{g:150,cat:'Carbs'})]);assert.equal(cat(r,'Carbs').spoons,3)});
test('Unknown bacon can use fat fallback only once',()=>{const r=result([item('Bacon',null,{g:20,cat:'Fat'})],'breakfast');assert.equal(cat(r,'Fat').spoons,2);assert.equal(cat(r,'Protein').spoons,0)});
test('Snack is not forced to contain Plants',()=>{const r=result([item('Skyr','Skyr natur',{g:150})],'snack');assert.equal(r.recommendationType,'neutral')});
test('Aha questions are capped at three',()=>{const r=result([item('Bohnen','Kidneybohnen',{g:120}),item('Avocado','Avocado',{g:60}),item('Reis','Reis weiß',{g:200})]);assert.ok(r.followUps.length<=3)});
test('Aha questions have distinct angles',()=>{const r=result([item('Bohnen','Kidneybohnen',{g:120}),item('Avocado','Avocado',{g:60}),item('Reis','Reis weiß',{g:200})]);assert.equal(new Set(r.followUps.map(x=>x.angle)).size,r.followUps.length)});

console.log(`\n${passed} Spoony engine tests passed.`);

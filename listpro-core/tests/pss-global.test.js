'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {cost,searchPSS15}=require('../src/pss-global');
const a=require('../benchmarks/manual-26-pss-1.3.json'),b=require('../benchmarks/manual-26-pss-1.4.json');
test('global objective preserves cheaper two-sheet alternative',()=>{assert(cost(a)[1]<cost(b)[1]);});
test('global budgets reject invalid values',()=>{assert.throws(()=>searchPSS15(a.parameters,{iterations:0}));});
test('global saved alternatives independently replay',()=>{const {validatePSS}=require('../src/pss-validator');for(const s of [a,b])assert(validatePSS(s.parameters,s,s.plan,s.equipmentProfile).panelSawStagedValid);});

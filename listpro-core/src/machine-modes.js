'use strict';
const {makePSSPlan}=require('./pss-plan');
const {validatePSS}=require('./pss-validator');
const {makeFormatSawPlan}=require('./format-saw-plan');
const {validateFormatSaw}=require('./format-saw-validator');
function makeMachinePlan(p,layout,profile){
 if(profile?.mode==='PANEL_SAW_STAGED')return makePSSPlan(p,layout,profile);
 if(profile?.mode==='FORMAT_SAW')return makeFormatSawPlan(p,layout,profile);
 throw Error('Unknown machine mode');
}
function validateMachinePlan(p,layout,plan,profile){
 if(profile?.mode==='PANEL_SAW_STAGED')return validatePSS(p,layout,plan,profile);
 if(profile?.mode==='FORMAT_SAW')return validateFormatSaw(p,layout,plan,profile);
 throw Error('Unknown machine mode');
}
module.exports={makeMachinePlan,validateMachinePlan};

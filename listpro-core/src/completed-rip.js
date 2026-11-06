'use strict';
const {buildCompletedLayout}=require('./completed-rip-layout'),{makeCompletedPlan}=require('./completed-rip-plan'),{validateCompleted}=require('./completed-rip-validator');
const profile=()=>({id:'completed-rip-v1',retainedSide:'HIGH_MATERIAL',seriesCompletionRequired:true,maxTurnsPerBlank:1,maxSheetTurns:0,initialCutAxes:['H','V'],allowTerminalBladeOverhang:true,realMachineFeasibility:'unknown'});
function verifyCompleted(p,layout){const equipmentProfile=profile(),plan=layout.plan||makeCompletedPlan(p,layout),verification=validateCompleted(p,layout,plan,equipmentProfile);return{...layout,parameters:p,equipmentProfile,plan,verification,metrics:verification.metrics};}
function compileCompleted(p,patterns,options){return verifyCompleted(p,buildCompletedLayout(p,patterns,options));}
module.exports={profile,compileCompleted,verifyCompleted};

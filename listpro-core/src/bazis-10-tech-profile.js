'use strict';
const base=require('../profiles/abstract-staged-detached-strips-exam-v1.json');
function techProfile(maxAncestryTurns=4,options={}){
 if(maxAncestryTurns!==null&&(!Number.isSafeInteger(maxAncestryTurns)||maxAncestryTurns<0))throw Error('Invalid ancestry limit');
 return {id:'brain-2.1-ancestry-'+(maxAncestryTurns??'unlimited'),mode:'PANEL_SAW_STAGED',
  abstract:true,machineFeasibility:'unknown',maxAncestryTurns,maxLocalTurns:1,
  initialLoadingTurns:0,countTrimRotations:true,settingPersistence:'across-feeds',
  usefulRemnantMinWidth:100,usefulRemnantMinHeight:100,
  ranking:['sheets','cuts','totalHandlingTurns','sizeSettings','operations','usefulRemnantArea','cutLength'],
  ...options,baseProfile:JSON.parse(JSON.stringify(options.baseProfile??base))};
}
function checkProfile(profile){
 if(!profile||profile.mode!=='PANEL_SAW_STAGED'||profile.abstract!==true||profile.initialLoadingTurns!==0||profile.countTrimRotations!==true||profile.maxLocalTurns!==1)throw Error('Unsupported technology semantics');
 if(profile.maxAncestryTurns!==null&&(!Number.isSafeInteger(profile.maxAncestryTurns)||profile.maxAncestryTurns<0))throw Error('Invalid ancestry limit');
 if(!['across-feeds','per-blank'].includes(profile.settingPersistence))throw Error('Invalid stop register model');
 for(const k of ['usefulRemnantMinWidth','usefulRemnantMinHeight'])if(!Number.isFinite(profile[k])||profile[k]<0)throw Error('Invalid remnant threshold');
 const required=['sheets','cuts','totalHandlingTurns','sizeSettings','operations','usefulRemnantArea','cutLength'];
 if(!Array.isArray(profile.ranking)||profile.ranking[0]!=='sheets'||profile.ranking.length!==required.length||new Set(profile.ranking).size!==required.length||profile.ranking.some(k=>!required.includes(k)))throw Error('Invalid ranking');
 if(profile.baseProfile?.mode!=='PANEL_SAW_STAGED')throw Error('Missing base staged profile');
 return profile;
}
module.exports={techProfile,checkProfile};
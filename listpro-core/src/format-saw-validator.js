'use strict';
// FORMAT_SAW has physical guillotine replay only: no primary role or anchor policy.
const {replayPhysical}=require('./physical-replay');
function validateFormatSaw(p,layout,plan,profile){
 if(!profile||profile.mode!=='FORMAT_SAW')throw Error('FORMAT_SAW profile required');
 if(plan.mode&&plan.mode!=='FORMAT_SAW')throw Error('Plan is not FORMAT_SAW');
 if(plan.mode&&plan.profileId!==profile.id)throw Error('FORMAT_SAW profile ID mismatch');
 const result=replayPhysical(p,layout,plan,profile);
 if(profile.maxTurnsPerBlank!=null&&result.blanks.some(b=>b.parentBlankId&&b.turnCount>profile.maxTurnsPerBlank))throw Error('Format saw explicit turn limit');
 if(profile.maxSheetTurns!=null&&result.blanks.some(b=>!b.parentBlankId&&b.turnCount>profile.maxSheetTurns))throw Error('Format saw explicit sheet turn limit');
 return {geometryValid:true,physicalValid:true,formatSawValid:true,machineProfileValid:true,conditional:true,mode:'FORMAT_SAW',
  profileId:profile.id,metrics:result.metrics,blanks:result.blanks};
}
module.exports={validateFormatSaw};

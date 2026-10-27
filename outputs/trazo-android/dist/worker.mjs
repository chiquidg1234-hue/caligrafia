import * as core from './core.mjs';
self.onmessage=async({data:{id,method,args}})=>{try{const result=await core[method](...args);self.postMessage({id,result});}catch(e){self.postMessage({id,error:e.message||String(e)});}};

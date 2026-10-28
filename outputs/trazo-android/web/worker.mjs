import * as core from './core.mjs';
import {composeDocument} from './document.mjs';
const methods={...core,composeDocument};
self.onmessage=async({data:{id,method,args}})=>{try{const result=await methods[method](...args);self.postMessage({id,result});}catch(e){self.postMessage({id,error:e.message||String(e)});}};

import json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class UiTests(unittest.TestCase):
    def test_reload_restores_watcher_and_global_job_counts(self):
        source=(ROOT/'static'/'app.js').read_text(encoding='utf-8')
        render=source[source.index('function renderState()'):source.index('function renderSamples()')]
        jobs=source[source.index('function renderJobs()'):source.index('function chooseCapture(')]
        harness=r"""
const vm=require('node:vm');const nodes={};
const $=id=>nodes[id]||(nodes[id]={value:'',checked:false,hidden:false,disabled:false,textContent:'',classList:{toggle(){}},replaceChildren(){},append(){}});
const modes=['original','clean','vector'].map(value=>({value,checked:value==='original'}));
const context={$,
 document:{querySelectorAll:()=>modes,querySelector:q=>modes.find(m=>q.includes(m.value))},
 state:{demo:false,samples:[],font:null,jobs:[],watch:true,inbox:'local',watch_error:'',watch_mode:'vector',watch_options:{threshold:222},job_counts:{total:152,pending:2,running:0,done:150,error:0},jobs_offset:150},
 sampleSignature:'',jobSignature:'',watchSignature:'',loadedFont:'',fontLoading:false,jobsOffset:150,
 renderSamples(){},updateMissing(){},loadPreviewFont(){},drawPage(){},refresh(){},
};vm.createContext(context);vm.runInContext(RENDER+'\n'+JOBS+';renderState();',context);
process.stdout.write(JSON.stringify({mode:modes.find(m=>m.checked)?.value,threshold:$('threshold').value,thresholdHidden:$('threshold-control').hidden,total:$('jobs-total').textContent,queue:$('queue-count').textContent,previousDisabled:$('jobs-previous').disabled,nextDisabled:$('jobs-next').disabled}));
""".replace('RENDER',json.dumps(render)).replace('JOBS',json.dumps(jobs))
        result=json.loads(subprocess.check_output(['node','-e',harness],encoding='utf-8'))
        self.assertEqual(result['mode'],'vector')
        self.assertEqual(str(result['threshold']),'222')
        self.assertFalse(result['thresholdHidden'])
        self.assertEqual(result['total'],'152 dibujos')
        self.assertEqual(result['queue'],2)
        self.assertFalse(result['previousDisabled'])
        self.assertTrue(result['nextDisabled'])

if __name__=='__main__':unittest.main()

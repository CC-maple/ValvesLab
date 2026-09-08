function verify_valvelab_v3()
root=fileparts(fileparts(mfilename('fullpath')));
cases=jsondecode(fileread(fullfile(root,'output','validation','v3-fixtures.json')));
m=build_valvelab_v3(); checks=0; steps=0; maxError=0;
for n=1:numel(cases)
    test=cases(n); vec=mat2str(valvelab_model.encode(test.initial),17);
    set_param([m '/Parameters'],'Value',vec); set_param([m '/Valve Dynamics'],'Parameters',vec);
    sm=simulation(m); cleanup=onCleanup(@()terminate(sm)); step(sm);
    for k=1:numel(test.checkpoints)
        point=test.checkpoints(k); v=mat2str(valvelab_model.encode(point.config),17);
        setBlockParameter(sm,[m '/Parameters'],'Value',v);
        step(sm,NumberOfSteps=point.steps);
        r=get_param([m '/Valve Dynamics'],'RuntimeObject'); actual=r.OutputPort(1).Data(1:16)';
        expected=valvelab_model.pack(point.expected);
        delta=max(abs(actual-expected)); maxError=max(maxError,delta);
        assert(delta<1e-7,'ValveLab:Parity','%s checkpoint %d mismatch: %.12g',test.name,k,delta);
        checks=checks+1; steps=steps+point.steps;
    end
    logs=sm.SimulationOutput.logsout;
    assert(logs.numElements==19,'ValveLab:Logging','Expected 19 logged signals.');
    logged=logs.getElement('opening').Values;
    assert(numel(logged.Time)>1 && all(abs(diff(logged.Time)-.05)<1e-7),'ValveLab:Logging','Logged sample times must be 0.05 s apart.');
    fprintf('PASS %s: t=%.2f s, Q=%.6f L/min\n',test.name,actual(1),actual(4));
    clear cleanup
end
c=valvelab_model.defaults(); c.kp=NaN; rejected=false;
try, valvelab_model.validate(c); catch, rejected=true; end
assert(rejected,'ValveLab:Validation','NaN must be rejected.');
result=struct('release',version('-release'),'scenarios',numel(cases),'checkpoints',checks, ...
    'dynamicSteps',steps,'maximumAbsoluteDifference',maxError,'loggedSignals',19,'passed',true);
file=fullfile(root,'output','validation','v3-simulink-results.json');
fid=fopen(file,'w'); closeFile=onCleanup(@()fclose(fid)); fprintf(fid,'%s',jsonencode(result,PrettyPrint=true));
disp(result); fprintf('VALVELAB_SIMULINK_VERIFICATION_PASS\n');
close_system(m,0); % Parameter tuning changes memory only; preserve the saved model.
end

function verify_valvelab_v31()
root=fileparts(fileparts(mfilename('fullpath')));
cases=jsondecode(fileread(fullfile(root,'output','validation','v3-fixtures.json')));
m=build_valvelab_v31(); checks=0; steps=0; maxError=0;
for n=1:numel(cases)
    test=cases(n); c=test.initial; c.sensorTau=.2;
    vec=mat2str([valvelab_model_v31.encode(c) 1],17);
    set_param([m '/Parameters'],'Value',vec); set_param([m '/Valve Dynamics'],'Parameters',vec);
    sm=simulation(m); cleanup=onCleanup(@()terminate(sm)); step(sm);
    for k=1:numel(test.checkpoints)
        point=test.checkpoints(k); c=point.config; c.sensorTau=.2;
        setBlockParameter(sm,[m '/Parameters'],'Value',mat2str([valvelab_model_v31.encode(c) k+1],17));
        step(sm,NumberOfSteps=point.steps);
        r=get_param([m '/Valve Dynamics'],'RuntimeObject'); output=r.OutputPort(1).Data(:)';
        delta=max(abs(output(1:16)-valvelab_model.pack(point.expected))); maxError=max(maxError,delta);
        assert(delta<1e-7,'ValveLab:Parity','%s checkpoint %d mismatch %.12g',test.name,k,delta);
        assert(output(20)==k+1,'ValveLab:Revision','Revision must travel through Simulink output.');
        checks=checks+1; steps=steps+point.steps;
    end
    assert(sm.SimulationOutput.logsout.numElements==20,'ValveLab:Logging','Expected 20 signals.');
    fprintf('V31 PARITY PASS %s\n',test.name); clear cleanup
end
for tau=[.05 .1 .2 .5 1]
    c=valvelab_model_v31.defaults(); c.sensorTau=tau;
    vec=mat2str([valvelab_model_v31.encode(c) 100],17);
    set_param([m '/Parameters'],'Value',vec); set_param([m '/Valve Dynamics'],'Parameters',vec);
    sm=simulation(m); cleanup=onCleanup(@()terminate(sm)); step(sm);
    c.fault='sensor'; c.sensorBias=15;
    setBlockParameter(sm,[m '/Parameters'],'Value',mat2str([valvelab_model_v31.encode(c) 101],17));
    for k=1:20
        step(sm); r=get_param([m '/Valve Dynamics'],'RuntimeObject'); a=r.OutputPort(1).Data;
        expected=65+15*(1-exp(-k*.05/tau));
        assert(abs(a(5)-expected)<1e-10,'ValveLab:Sensor','Analytic sensor response mismatch.'); checks=checks+1;
    end
    clear cleanup
end
close_system(m,0);
service=ValveLabServiceV31(18766); finish=onCleanup(@()delete(service)); stop(service.Clock);
a=service.snapshot(); revision=a.appliedRevision;
service.configure(struct('manual',70)); b=service.snapshot();
assert(b.revision>revision && b.appliedRevision==revision && b.state.time==0 && b.state.opening==65);
service.configure(struct('manual',75)); service.advance(); a=service.snapshot();
assert(a.appliedRevision==a.revision && a.appliedTime==.05 && abs(a.state.opening-65.6)<1e-10);
assert(strcmp(service.ConfigHistory(2).status,'superseded') && strcmp(service.ConfigHistory(3).status,'applied'));
assert(service.Events(end).appliedTime==.05 && contains(service.Events(end).message,'70 → 75'));
checks=checks+4;
for id={'manual','pid','pressure','sensor','fault'}
    [c,plan,name,group]=valvelab_lesson_v31(id{1},service.Config);
    service.Config=c; service.RunName=name; service.initialize(); service.Plan=plan; service.LessonId=id{1};
    for k=1:600, service.advance(); end
    applied=service.Events(strcmp({service.Events.phase},'applied'));
    assert(numel(applied)==numel(plan));
    assert(all(abs([applied.appliedTime]-[plan.time])<1e-8),'ValveLab:Lesson','Lesson events must hit exact sample times.');
    assert(abs(service.Data(1)-30)<1e-8 && ~service.Running && isempty(service.Plan));
    fprintf('V31 LESSON PASS %s (%s)\n',name,group); checks=checks+2;
end
w=service.Waveform; w.group='pid'; w.span=5;
samples=service.Samples(1:service.Count,:); samples(:,10:12)=.1; samples(1:5,10:12)=1000;
lim=valvelab_scope_v31(service.Model,w,samples,true);
assert(size(lim,1)==3 && max(lim,[],'all')<2,'ValveLab:Scope','Visible-window Y limits must shrink past old peaks.');
w.yMode='locked'; samples(:,10:12)=500; locked=valvelab_scope_v31(service.Model,w,samples,false);
assert(isequal(lim,locked),'ValveLab:Scope','Locked Y limits changed.'); checks=checks+2;
exported=service.export(); d=load(exported.mat,'run'); csv=readtable(exported.csv);
assert(width(csv)==20 && height(csv)==601 && max(abs(csv{:,:}-d.run.signals{:,:}),[],'all')<1e-10);
assert(strcmp(d.run.version,'3.1') && isfield(d.run.config,'sensorTau'));
assert(all(isfinite([d.run.events(strcmp({d.run.events.phase},'applied')).appliedTime]))); checks=checks+3;
fprintf('V31 EXPORT AND SCOPE PASS\n');
f=analyze_valvelab_v31(d.run,false,service.AnalysisFigure); exportgraphics(f,fullfile(root,'output','validation','v31-events-waveforms.png'),'Resolution',120);
fprintf('V31 EVENT FIGURE PASS\n');
id=valvelab_import_run_v31(d.run); valvelab_sdi_v31(service.RunID,id,'all');
assert(numel(Simulink.sdi.getAllRunIDs)>1); checks=checks+1;
r=valvelab_sensor_lesson(.2,false,service.SensorFigure); assert(abs(r.atTau-63.2120558828558)<1e-10);
exportgraphics(service.SensorFigure,fullfile(root,'output','validation','v31-sensor-step.png'),'Resolution',120); checks=checks+1;
service.Owner='verify-client'; service.Heartbeat=posixtime(datetime('now'))-4; service.Running=true;
before=service.Data; service.tick(); assert(~service.Running && isempty(service.Owner) && isequal(before,service.Data)); checks=checks+1;
bad=valvelab_model_v31.defaults(); bad.sensorTau=.3; rejected=false; try, valvelab_model_v31.validate(bad); catch, rejected=true; end
assert(rejected); checks=checks+1;
result=struct('passed',true,'checks',checks,'parityScenarios',numel(cases),'paritySteps',steps,'maxParityError',maxError,'export',exported);
fid=fopen(fullfile(root,'output','validation','v31-matlab-results.json'),'w'); fileCleanup=onCleanup(@()fclose(fid)); %#ok<NASGU>
fprintf(fid,'%s',jsonencode(result,PrettyPrint=true)); disp(result);
clear finish
close_system(m,0);
fprintf('VALVELAB_V31_VERIFICATION_PASS\n');
end

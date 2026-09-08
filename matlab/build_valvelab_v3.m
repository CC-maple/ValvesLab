function model = build_valvelab_v3()
% Create once; existing models are opened, never overwritten by startup.
root=fileparts(mfilename('fullpath')); addpath(root);
model='valvelab_v3'; target=fullfile(root,[model '.slx']);
if isfile(target), load_system(target); return; end
assert(~bdIsLoaded(model),'ValveLab:Model','An unsaved model named valvelab_v3 is already loaded.');
new_system(model);
c=valvelab_model.defaults(); vec=mat2str(valvelab_model.encode(c),17);
set_param(model,'SolverType','Fixed-step','Solver','FixedStepDiscrete','FixedStep','0.05', ...
    'StartTime','0','StopTime','1800','SaveOutput','on','OutputSaveName','yout', ...
    'SaveFormat','Dataset','ReturnWorkspaceOutputs','on','SignalLogging','on', ...
    'SignalLoggingName','logsout','BlockReduction','off');
add_block('simulink/Sources/Constant',[model '/Parameters'],'Value',vec,'Position',[40 140 150 190]);
add_block('simulink/User-Defined Functions/Level-2 MATLAB S-Function',[model '/Valve Dynamics'], ...
    'FunctionName','valvelab_sfun','Parameters',vec,'Position',[215 125 395 205]);
add_block('simulink/Sinks/Out1',[model '/Telemetry'],'Position',[475 60 505 80]);
add_block('simulink/Signal Routing/Demux',[model '/Signals'],'Outputs','19','Position',[465 115 470 675]);
add_line(model,'Parameters/1','Valve Dynamics/1');
add_line(model,'Valve Dynamics/1','Telemetry/1','autorouting','on');
add_line(model,'Valve Dynamics/1','Signals/1','autorouting','on');
names=valvelab_model.signalNames();
for n=1:19
    dest=sprintf('Log_%s',names{n}); y=110+n*29;
    add_block('simulink/Sinks/Terminator',[model '/' dest],'Position',[800 y 820 y+14]);
    line=add_line(model,['Signals/' num2str(n)],[dest '/1'],'autorouting','on');
    set_param(line,'Name',names{n}); Simulink.sdi.markSignalForStreaming(line,'on');
end
groups={[17 4 5],[3 2],[10 11 12]}; scopes={'Flow Scope','Position Scope','PID Scope'};
for n=1:3
    y=120+(n-1)*170;
    add_block('simulink/Sinks/Scope',[model '/' scopes{n}], ...
        'NumInputPorts',num2str(numel(groups{n})),'Position',[610 y 685 y+80]);
    sc=get_param([model '/' scopes{n}],'ScopeConfiguration'); sc.ShowLegend=true;
    for k=1:numel(groups{n})
        add_line(model,['Signals/' num2str(groups{n}(k))],[scopes{n} '/' num2str(k)],'autorouting','on');
    end
end
a=Simulink.Annotation(model,'ValveLab v3 | MATLAB R2025b | discrete dt = 0.05 s'); a.Position=[40 15];
a=Simulink.Annotation(model,'Parameters -> PID + actuator + valve + sensor\nEquations: valvelab_model.m; state: Simulink DWork'); a.Position=[40 255];
save_system(model,target);
end

function probe_valvelab_v31_scope_figure()
root=fileparts(fileparts(mfilename('fullpath'))); files=dir(fullfile(root,'matlab','runs','v3.1','*.mat'));
data=load(fullfile(files(end).folder,files(end).name),'run');
m=build_valvelab_v31(); w=data.run.waveform; w.group='pid'; w.pidLayout='split';
valvelab_scope_v31(m,w,data.run.signals{:,:},true); fprintf('PROBE Scope configured\n');
f=analyze_valvelab_v31(data.run,false); fprintf('PROBE analysis figure pass\n');
exportgraphics(f,fullfile(root,'output','validation','v31-scope-figure-probe.png'));
fprintf('PROBE combined scope/figure pass\n');
end

function verify_valvelab_v31_runtime()
root=fileparts(fileparts(mfilename('fullpath')));
fprintf('RUNTIME before constructor\n'); s=ValveLabServiceV31(19766); finish=onCleanup(@()delete(s)); %#ok<NASGU>
stop(s.Clock); fprintf('RUNTIME constructor pass\n');
s.configure(struct('manual',100)); for k=1:10, s.advance(); end
f=analyze_valvelab_v31(s.runData(),false,s.AnalysisFigure); fprintf('RUNTIME active Sim analysis pass\n');
exportgraphics(f,fullfile(root,'output','validation','v31-live-analysis.png'),'Resolution',120);
valvelab_sensor_lesson(.2,false,s.SensorFigure); fprintf('RUNTIME active Sim sensor figure pass\n');
valvelab_sdi_v31(s.RunID,[],'flow'); fprintf('RUNTIME streamed SDI pass\n');
first=valvelab_import_run_v31(s.runData()); second=valvelab_import_run_v31(s.runData());
valvelab_sdi_v31(first,second,'all',true); fprintf('RUNTIME snapshot SDI comparison pass\n');
fprintf('VALVELAB_V31_RUNTIME_PASS\n');
end

function verify_valvelab_v31_figures()
root=fileparts(fileparts(mfilename('fullpath'))); files=dir(fullfile(root,'matlab','runs','v3.1','*.mat'));
data=load(fullfile(files(end).folder,files(end).name),'run');
fprintf('FIGURES before analysis\n'); f=analyze_valvelab_v31(data.run,false);
fprintf('FIGURES after analysis\n'); exportgraphics(f,fullfile(root,'output','validation','v31-events-waveforms.png'),'Resolution',120); close(f);
fprintf('FIGURES after export\n'); r=valvelab_sensor_lesson(.2,false); assert(abs(r.atTau-63.2120558828558)<1e-10);
exportgraphics(gcf,fullfile(root,'output','validation','v31-sensor-step.png'),'Resolution',120); close(gcf);
fprintf('FIGURES sensor pass\n');
end

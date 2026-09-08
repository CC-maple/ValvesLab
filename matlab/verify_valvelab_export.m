function verify_valvelab_export()
root=fileparts(fileparts(mfilename('fullpath')));
result=jsondecode(fileread(fullfile(root,'output','validation','v3-bridge-results.json')));
file=result.exports.mat; data=load(file,'run'); run=data.run;
csv=readtable(result.exports.csv);
assert(height(run.signals)==result.exports.samples && height(csv)==height(run.signals));
assert(isequal(run.signals.Properties.VariableNames,csv.Properties.VariableNames));
assert(max(abs(run.signals{:,:}-csv{:,:}),[],'all')<1e-10);
assert(all(abs(diff(run.signals.time)-.05)<1e-9));
assert(~isempty(run.configHistory) && ~isempty(run.events));
assert(strcmp(run.release,'2025b'));
run=analyze_valvelab_run(file);
set(gcf,'Position',[80 80 1100 820]);
exportgraphics(gcf,fullfile(root,'output','validation','v3-export-waveforms.png'),'Resolution',140);
fprintf('VALVELAB_EXPORT_PASS: %d rows, 19 signals, MAT/CSV values agree.\n',height(run.signals));
end

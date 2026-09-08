function id=valvelab_import_run_v31(run)
dataset=Simulink.SimulationData.Dataset;
names=run.signals.Properties.VariableNames;
for n=2:numel(names)
    series=timeseries(run.signals.(names{n}),run.signals.time,'Name',names{n});
    dataset=dataset.addElement(series,names{n});
end
id=Simulink.sdi.createRun(['保存记录 · ' run.name],'vars',dataset);
end

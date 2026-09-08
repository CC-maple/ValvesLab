function repair_valvelab_v31_test_names()
% Correct metadata in these two agent-generated test exports only; signals stay intact.
root=fullfile(fileparts(mfilename('fullpath')),'runs','v3.1');
for file={'valvelab_20260907_205650_142_3.mat','valvelab_20260907_210409_366_2.mat'}
    target=fullfile(root,file{1}); data=load(target,'run'); run=data.run;
    assert(startsWith(run.name,'V3.1 '),'ValveLab:TestFile','Unexpected test export.');
    run.name='V3.1 浏览器验收'; save(target,'run');
end
end

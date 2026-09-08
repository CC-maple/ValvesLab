function probe_valvelab_v31_graphics()
fprintf('GRAPHICS before figure\n');
f=figure('Visible','off'); fprintf('GRAPHICS after figure\n');
tiledlayout(f,2,1); fprintf('GRAPHICS after layout\n');
ax=nexttile; plot(ax,[0 1],[0 1]); fprintf('GRAPHICS after plot\n');
exportgraphics(f,fullfile(fileparts(fileparts(mfilename('fullpath'))),'output','validation','v31-graphics-probe.png'));
fprintf('GRAPHICS export pass\n'); close(f);
end

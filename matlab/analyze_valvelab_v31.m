function f=analyze_valvelab_v31(input,visible,target)
% Native MATLAB figure with aligned event markers; no resimulation.
if ischar(input) || isstring(input), data=load(input,'run'); run=data.run; else, run=input; end
t=run.signals;
if nargin<2, visible=true; end
fprintf('ValveLab: creating recorded-analysis window\n');
if nargin<3
    f=figure('Name',['ValveLab | ' run.name],'NumberTitle','off','Position',[150 100 1080 850],'Visible',visible,'WindowStyle','normal');
else
    f=target; clf(f); f.Name=['ValveLab | ' run.name]; f.Visible=visible;
end
layout=tiledlayout(f,5,1,'TileSpacing','compact'); axesList=gobjects(5,1);
groups={{'setpoint','trueFlow','measuredFlow'},{'command','opening'},{'p'},{'i'},{'d'}};
colors={[227 200 117;121 201 239;107 213 197]/255,[186 175 233;237 180 118]/255,[.53 .75 .89],[.86 .68 .39],[.67 .59 .86]};
for row=1:5
    ax=nexttile(layout,row); axesList(row)=ax; hold(ax,'on');
    for n=1:numel(groups{row})
        key=groups{row}{n}; style='-'; if any(strcmp(key,{'setpoint','command'})), style='--'; end
        plot(ax,t.time,t.(key),style,'LineWidth',1.3,'Color',colors{row}(n,:),'DisplayName',key);
    end
    if row==1, ylabel(ax,'Flow (L/min)'); elseif row==2, ylabel(ax,'Position (%)'); else, labels={'P (%)','I (%)','D (%)'}; ylabel(ax,labels{row-2}); end
    grid(ax,'on'); legend(ax,'show','Location','eastoutside');
    if ~isempty(run.events)
        events=run.events(strcmp({run.events.phase},'applied'));
        for n=1:numel(events)
            event=events(n); label=''; if row==1, label=event.message; end
            xline(ax,event.appliedTime,':',label,'HandleVisibility','off','LabelOrientation','aligned','Color',[.6 .6 .6]);
        end
    end
end
linkaxes(axesList,'x'); xlabel(axesList(end),'Simulation time (s)');
title(axesList(1),sprintf('%s | dt=0.05 s | event markers: applied sample time',run.name),'Interpreter','none');
fprintf('ValveLab V3.1 analysis: %d samples, %.2f s; default sensor tau %.2f s\n',height(t),t.time(end),run.config.sensorTau);
end

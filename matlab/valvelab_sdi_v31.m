function valvelab_sdi_v31(current,reference,group,styleCurrent)
% Clear plotted selections only; never delete any SDI runs.
if nargin<4, styleCurrent=false; end
Simulink.sdi.clearAllSubPlots;
if ~isempty(reference) || strcmp(group,'all')
    groups={{'setpoint','trueFlow','measuredFlow'},{'command','opening'},{'p'},{'i'},{'d'}};
elseif strcmp(group,'flow'), groups={{'setpoint','trueFlow','measuredFlow'}};
elseif strcmp(group,'position'), groups={{'command','opening'}};
else, groups={{'p'},{'i'},{'d'}}; end
Simulink.sdi.setSubPlotLayout(numel(groups),1);
names={'setpoint','measuredFlow','trueFlow','command','opening','p','i','d'};
colors=[227 200 117;107 213 197;121 201 239;186 175 233;237 180 118;135 192 226;219 174 99;171 151 220]/255;
labels={'SP · setpoint','PV · measuredFlow','Q · trueFlow','u · command','x · opening','P · p','I · i','D · d'};
for runId=[current reference]
    r=Simulink.sdi.getRun(runId);
    for k=1:r.SignalCount
        signal=r.getSignalByIndex(k);
        for n=1:numel(names)
            if strcmp(signal.Name,names{n}) || contains(signal.Name,labels{n})
                if n<=3, units='L/min'; else, units='%'; end
                % Active R2025b model signals are immutable while streaming.
                % Imported records have no Model and can be styled for comparison.
                if runId~=current || styleCurrent
                    signal.Name=[labels{n} ' [' units ']']; signal.LineColor=colors(n,:);
                    signal.LineDashed='-';
                    if n==1 || n==4, signal.LineDashed='--'; end
                    if runId~=current, signal.LineDashed=':'; end
                    signal.LineWidth=2;
                end
                for row=1:numel(groups)
                    if any(strcmp(names{n},groups{row})), plotOnSubPlot(signal,row,1,true); end
                end
            end
        end
    end
end
Simulink.sdi.view;
end

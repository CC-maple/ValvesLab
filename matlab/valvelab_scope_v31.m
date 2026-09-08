function limits=valvelab_scope_v31(model,w,samples,openWindow)
% Display-only work. Scaling uses actual Simulink samples in the visible window.
% R2025b exposes YLimits; calculate these explicitly so old peaks can shrink away.
scopes={'Flow Scope','Position Scope','PID Scope'}; keys={'flow','position','pid'};
groups={[17 4 5],[3 2],[10 11 12]}; index=find(strcmp(w.group,keys));
assert(~isempty(index),'ValveLab:Scope','Invalid waveform group.');
t=samples(end,1);
if strcmp(w.mode,'live'), from=max(0,t-w.span); to=max(w.span,t);
elseif strcmp(w.mode,'full'), from=0; to=max(.05,t);
else, from=w.from; to=w.to; end
sc=get_param([model '/' scopes{index}],'ScopeConfiguration');
if openWindow
    for n=1:3
        other=get_param([model '/' scopes{n}],'ScopeConfiguration'); other.Visible=false;
    end
    if index==3 && strcmp(w.pidLayout,'split'), sc.LayoutDimensions=[3 1]; else, sc.LayoutDimensions=[1 1]; end
    sc.TimeSpan=num2str(to-from,17); sc.TimeDisplayOffset=num2str(from,17);
    if strcmp(w.mode,'live'), sc.TimeSpan=num2str(w.span); sc.TimeDisplayOffset='0'; end
    sc.TimeSpanOverrunAction='Scroll'; sc.TimeUnits='Seconds'; sc.AxesScaling='Manual';
end
window=samples(samples(:,1)>=from-1e-8 & samples(:,1)<=to+1e-8,:);
limits=zeros(prod(sc.LayoutDimensions),2);
for row=1:prod(sc.LayoutDimensions)
    sc.ActiveDisplay=row;
    sc.ShowLegend=true; sc.ShowGrid=true;
    if index==1, sc.YLabel='Flow (L/min)'; sc.Title='setpoint SP / trueFlow Q / measuredFlow PV';
    elseif index==2, sc.YLabel='Position (%)'; sc.Title='command u / opening x';
    else
        sc.YLabel='PID contribution (%)';
        if prod(sc.LayoutDimensions)==3, labels={'P','I','D'}; sc.Title=labels{row}; else, sc.Title='P / I / D'; end
    end
    if strcmp(w.yMode,'auto') && ~isempty(window)
        cols=groups{index}; if prod(sc.LayoutDimensions)==3, cols=cols(row); end
        values=window(:,cols); lo=min(values,[],'all'); hi=max(values,[],'all');
        pad=max(.5,(hi-lo)*.1); sc.YLimits=[lo-pad hi+pad];
    end
    limits(row,:)=sc.YLimits;
end
if openWindow, open_system([model '/' scopes{index}]); end
end

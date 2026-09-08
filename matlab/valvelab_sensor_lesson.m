function result=valvelab_sensor_lesson(tau,visible,target)
% Independent, exact first-order response; all numeric work remains in MATLAB.
assert(isscalar(tau) && any(abs(tau-[.05 .1 .2 .5 1])<1e-10),'ValveLab:Sensor','Invalid sensor time constant.');
t=(0:.05:5*tau)'; response=100*(1-exp(-t/tau));
if nargin<2, visible=true; end
if nargin<3
    f=figure('Name','ValveLab | Sensor step: 63.2%','NumberTitle','off','Visible',visible,'WindowStyle','normal');
else
    f=target; clf(f); f.Visible=visible;
end
ax=axes(f); plot(ax,t,response,'o-','Color',[.42 .84 .77],'MarkerSize',4); hold(ax,'on');
yline(ax,100,'--','Input 100%'); xline(ax,tau,'--','1 tau: 63.2%'); xline(ax,3*tau,':','3 tau: 95.0%');
scatter(ax,[tau 3*tau],100*(1-exp(-[1 3])),55,[.92 .68 .38],'filled');
grid(ax,'on'); xlabel(ax,'Time (s)'); ylabel(ax,'Completed change (%)');
title(ax,sprintf('Independent sensor | tau = %.2f s | sample step = 0.05 s',tau));
subtitle(ax,'Constant step input only; do not identify sensor tau from the full PID/actuator loop');
result=struct('tau',tau,'atTau',100*(1-exp(-1)),'atThreeTau',100*(1-exp(-3)),'step',.05);
assignin('base','valvelab_sensor_response',table(t,response,'VariableNames',{'time','percent'}));
end

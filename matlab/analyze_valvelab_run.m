function run=analyze_valvelab_run(file)
% Reopen an exported experiment in MATLAB without rerunning the model.
data=load(file,'run'); run=data.run; t=run.signals;
figure('Name','ValveLab recorded experiment'); tiledlayout(3,1);
nexttile; plot(t.time,[t.setpoint t.trueFlow t.measuredFlow]); ylabel('Flow (L/min)'); legend('SP','Q','PV'); grid on;
nexttile; plot(t.time,[t.command t.opening]); ylabel('Position (%)'); legend('Command','Actual'); grid on;
nexttile; plot(t.time,[t.p t.i t.d]); ylabel('PID output (%)'); xlabel('Simulation time (s)'); legend('P','I','D'); grid on;
fprintf('Samples: %d, duration: %.2f s, final tracking error: %.4f L/min\n',height(t),t.time(end),t.setpoint(end)-t.measuredFlow(end));
end

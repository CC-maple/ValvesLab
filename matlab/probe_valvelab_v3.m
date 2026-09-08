function probe_valvelab_v3()
m=build_valvelab_v3(); s=simulation(m);
cleanup=onCleanup(@()terminate(s));
step(s); r=get_param([m '/Valve Dynamics'],'RuntimeObject');
disp('INITIAL_OUTPUT'); disp(r.OutputPort(1).Data');
c=valvelab_model.defaults(); c.manual=100;
setBlockParameter(s,[m '/Parameters'],'Value',mat2str(valvelab_model.encode(c),17));
step(s); disp('FIRST_STEP_OUTPUT'); disp(r.OutputPort(1).Data');
assert(abs(r.OutputPort(1).Data(1)-0.05)<1e-10);
assert(r.OutputPort(1).Data(2)>65 && r.OutputPort(1).Data(2)<=65.6+1e-10);
step(s,NumberOfSteps=10); disp('SIMULINK_OUTPUT'); disp(s.SimulationOutput);
fprintf('VALVELAB_PROBE_PASS\n');
end

function probe_valvelab_v31_scope()
m=build_valvelab_v3(); sc=get_param([m '/Flow Scope'],'ScopeConfiguration');
disp(properties(sc)); disp(get_param([m '/Flow Scope'],'DialogParameters'));
disp(sc); close_system(m,0);
fprintf('V31_SCOPE_PROBE_DONE\n');
end

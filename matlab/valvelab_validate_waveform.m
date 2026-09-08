function valvelab_validate_waveform(w,t,running)
fields={'group';'span';'mode';'yMode';'pidLayout';'from';'to'};
assert(isstruct(w) && isscalar(w) && isequal(sort(fieldnames(w)),sort(fields)),'ValveLab:Scope','波形设置字段不完整。');
enums=struct('group',{{'flow','position','pid'}},'mode',{{'live','full','range'}},'yMode',{{'auto','locked'}},'pidLayout',{{'split','overlay'}});
for k=fieldnames(enums)'
    assert(ischar(w.(k{1})) && any(strcmp(w.(k{1}),enums.(k{1}))),'ValveLab:Scope','无效波形选项。');
end
for k={'span','from','to'}
    v=w.(k{1}); assert(isnumeric(v) && isscalar(v) && isreal(v) && isfinite(v),'ValveLab:Scope','波形时间必须是有限数值。');
end
assert(any(w.span==[5 10 20 60]),'ValveLab:Scope','时间窗仅支持 5、10、20、60 s。');
assert(strcmp(w.mode,'live') || ~running,'ValveLab:Scope','请暂停后选择全程或选段。');
assert(w.from>=0 && w.to>w.from && w.to<=1800,'ValveLab:Scope','时间范围无效。');
if strcmp(w.mode,'range'), assert(w.to<=t+1e-8,'ValveLab:Scope','选段超过本次已有采样。'); end
end

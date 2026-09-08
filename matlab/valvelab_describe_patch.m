function description=valvelab_describe_patch(previous,c)
names=struct('mode','控制模式','manual','阀位命令 u','setpoint','目标流量 SP', ...
    'kp','Kp','ki','Ki','kd','Kd','actuator','执行机构','timeConstant','机构时间常数', ...
    'maxSpeed','最大行程速度','failPosition','失气位置','inlet','入口压力','outlet','出口压力', ...
    'fault','故障','leakage','泄漏系数','sensorBias','测量偏差','sensorTau','传感器时间常数');
enums=struct('manual','手动','auto','PID 自动','electric','电动','pneumatic','气动', ...
    'none','无故障','stuck','阀杆卡死','supply','驱动能源中断','leak','阀座泄漏','sensor','传感器偏差');
units=struct('manual',' %','setpoint',' L/min','timeConstant',' s','maxSpeed',' %/s', ...
    'failPosition',' %','inlet',' bar','outlet',' bar','sensorBias',' L/min','sensorTau',' s');
parts={}; keys=fieldnames(c);
for n=1:numel(keys)
    k=keys{n}; if isequal(previous.(k),c.(k)), continue; end
    if ischar(c.(k)), a=enums.(previous.(k)); b=enums.(c.(k)); unit='';
    else, a=num2str(previous.(k),6); b=num2str(c.(k),6); unit=''; if isfield(units,k), unit=units.(k); end
    end
    parts{end+1}=[names.(k) ' ' a ' → ' b unit]; %#ok<AGROW>
end
description=strjoin(parts,'；');
end

function [c,plan,name,group]=valvelab_lesson_v31(id,current)
assert(ischar(id) && any(strcmp(id,{'manual','pid','pressure','sensor','fault'})),'ValveLab:Lesson','未知课程。');
c=valvelab_model_v31.defaults('control');
for k={'kp','ki','kd','actuator','timeConstant','maxSpeed','failPosition','sensorTau'}, c.(k{1})=current.(k{1}); end
group='flow';
switch id
    case 'manual'
        name='命令与实际阀位'; group='position'; c.manual=30;
        plan=struct('time',5,'patch',struct('manual',70));
    case 'pid'
        name='PID 目标跟踪'; c.mode='auto'; c.setpoint=60;
        plan=struct('time',5,'patch',struct('setpoint',75));
    case 'pressure'
        name='压差扰动'; c.mode='auto'; c.setpoint=60;
        plan=struct('time',{10,20},'patch',{struct('inlet',1.25),struct('inlet',2)});
    case 'sensor'
        name=sprintf('传感器响应 tau=%.2f s',c.sensorTau); c.manual=30;
        plan=struct('time',5,'patch',struct('manual',70));
    case 'fault'
        name='卡死与恢复'; group='position'; c.mode='auto'; c.setpoint=60;
        plan=struct('time',{10,12,20},'patch',{struct('fault','stuck'),struct('setpoint',75),struct('fault','none')});
end
valvelab_model_v31.validate(c);
end

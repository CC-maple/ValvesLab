classdef valvelab_model
    % Discrete educational equations, executed by the Simulink solver.
    methods (Static)
        function c = defaults(valve)
            if nargin == 0, valve = 'control'; end
            c = struct('valveId',valve,'mode','manual','manual',65,'setpoint',60, ...
                'kp',1.1,'ki',0.55,'kd',0.04,'actuator','electric', ...
                'timeConstant',0.8,'maxSpeed',12,'failPosition',0, ...
                'inlet',2,'outlet',1,'fault','none','leakage',0.05,'sensorBias',15);
        end
        function names = stateNames()
            names = {'time','opening','command','trueFlow','measuredFlow','leakFlow', ...
                'integral','derivative','previousPV','p','i','d','error', ...
                'saturated','integrationHeld','holdController'};
        end
        function names = signalNames()
            names = [valvelab_model.stateNames(), {'setpoint','inlet','outlet'}];
        end
        function validate(c)
            d = valvelab_model.defaults();
            assert(isstruct(c) && isscalar(c) && isequal(sort(fieldnames(c)),sort(fieldnames(d))), ...
                'ValveLab:Config','Configuration fields do not match the protocol.');
            enums = struct('valveId',{{'ball','butterfly','gate','globe','control'}}, ...
                'mode',{{'manual','auto'}},'actuator',{{'electric','pneumatic'}}, ...
                'fault',{{'none','stuck','supply','leak','sensor'}});
            keys = fieldnames(enums);
            for n = 1:numel(keys)
                k=keys{n}; assert(ischar(c.(k)) && isrow(c.(k)) && any(strcmp(c.(k),enums.(k))), ...
                    'ValveLab:Config','Invalid enumeration: %s',k);
            end
            ranges = {'manual',0,100;'setpoint',0,150;'kp',0,5;'ki',0,3;'kd',0,1; ...
                'timeConstant',0.1,3;'maxSpeed',2,60;'inlet',0,4;'outlet',0,4; ...
                'leakage',0.01,0.15;'sensorBias',-30,30;'failPosition',0,100};
            for n=1:size(ranges,1)
                x=c.(ranges{n,1});
                assert(isnumeric(x) && isscalar(x) && isreal(x) && isfinite(x) && ...
                    x>=ranges{n,2} && x<=ranges{n,3},'ValveLab:Config','Invalid number: %s',ranges{n,1});
            end
            assert(any(c.failPosition == [0 100]),'ValveLab:Config','Invalid fail position.');
        end
        function v = encode(c)
            valvelab_model.validate(c);
            v=[find(strcmp(c.valveId,{'ball','butterfly','gate','globe','control'})), ...
                strcmp(c.mode,'auto'),c.manual,c.setpoint,c.kp,c.ki,c.kd, ...
                strcmp(c.actuator,'pneumatic'),c.timeConstant,c.maxSpeed,c.failPosition, ...
                c.inlet,c.outlet,find(strcmp(c.fault,{'none','stuck','supply','leak','sensor'}))-1,c.leakage,c.sensorBias];
        end
        function c = decode(v)
            valves={'ball','butterfly','gate','globe','control'}; modes={'manual','auto'};
            acts={'electric','pneumatic'}; faults={'none','stuck','supply','leak','sensor'};
            c=struct('valveId',valves{v(1)},'mode',modes{v(2)+1},'manual',v(3),'setpoint',v(4), ...
                'kp',v(5),'ki',v(6),'kd',v(7),'actuator',acts{v(8)+1},'timeConstant',v(9), ...
                'maxSpeed',v(10),'failPosition',v(11),'inlet',v(12),'outlet',v(13), ...
                'fault',faults{v(14)+1},'leakage',v(15),'sensorBias',v(16));
        end
        function v = pack(s)
            names=valvelab_model.stateNames(); v=zeros(1,numel(names));
            for n=1:numel(names), v(n)=s.(names{n}); end
        end
        function s = unpack(v)
            s=cell2struct(num2cell(v(:)),valvelab_model.stateNames(),1);
            for k={'saturated','integrationHeld','holdController'}, s.(k{1})=logical(s.(k{1})); end
        end
        function [q,leak] = flow(c,opening)
            h=min(1,max(0,opening/100));
            switch c.valveId
                case 'ball', k=sin(pi*h/2)^2.4;
                case 'butterfly', k=(1-cos(pi*h/2))^1.1;
                case 'gate', k=1-(1-h)^2;
                case 'globe', k=1.3*h/(1+0.3*h);
                case 'control', k=h;
                otherwise, error('ValveLab:Valve','Unsupported valve.');
            end
            if h==0 || h==1, k=h; end
            cap=100*sqrt(max(0,c.inlet-c.outlet));
            leak=cap*strcmp(c.fault,'leak')*c.leakage*(1-k); q=cap*k+leak;
        end
        function s = initial(c)
            valvelab_model.validate(c); [q,leak]=valvelab_model.flow(c,65);
            pv=max(0,q+strcmp(c.fault,'sensor')*c.sensorBias);
            command=65; if strcmp(c.mode,'manual'), command=c.manual; end
            p=c.kp*(c.setpoint-pv); integral=command-p;
            s=valvelab_model.unpack([0 65 command q pv leak integral 0 pv p integral 0 c.setpoint-pv 0 0 1]);
        end
        function s = advance(s,previous,c,dt)
            if ~strcmp(previous.mode,c.mode) || any([previous.kp previous.ki previous.kd] ~= [c.kp c.ki c.kd])
                s.integral=s.command-c.kp*(c.setpoint-s.measuredFlow)+c.kd*s.derivative;
                s.holdController=true;
            end
            err=c.setpoint-s.measuredFlow; derivative=s.derivative;
            if ~s.holdController
                derivative=derivative+((s.measuredFlow-s.previousPV)/dt-derivative)*(1-exp(-dt/0.15));
            end
            p=c.kp*err; d=-c.kd*derivative; integral=s.integral;
            held=any(strcmp(c.fault,{'stuck','supply'})) || s.holdController;
            if strcmp(c.mode,'auto') && ~held
                candidate=integral+c.ki*err*dt; raw=p+candidate+d;
                held=(raw>100 && err>0) || (raw<0 && err<0);
                if ~held, integral=min(2000,max(-2000,candidate));
                elseif raw>100 && p+integral+d<100, integral=100-p-d;
                elseif raw<0 && p+integral+d>0, integral=-p-d;
                end
            end
            if strcmp(c.mode,'manual'), integral=c.manual-p-d; end
            raw=p+integral+d; command=min(100,max(0,raw));
            if strcmp(c.mode,'manual'), command=c.manual; end
            opening=s.opening;
            holdPosition=strcmp(c.fault,'stuck') || (strcmp(c.fault,'supply') && strcmp(c.actuator,'electric'));
            if ~holdPosition
                target=command; tau=c.timeConstant; rate=c.maxSpeed;
                if strcmp(c.fault,'supply') && strcmp(c.actuator,'pneumatic')
                    target=c.failPosition; tau=0.6; rate=25;
                end
                delta=(target-opening)*(1-exp(-dt/tau));
                opening=min(100,max(0,opening+min(rate*dt,max(-rate*dt,delta))));
                if abs(target-opening)<0.001, opening=target; end
            end
            [q,leak]=valvelab_model.flow(c,opening);
            sensor=max(0,q+strcmp(c.fault,'sensor')*c.sensorBias);
            pv=s.measuredFlow+(sensor-s.measuredFlow)*(1-exp(-dt/0.2));
            saturated=raw<0 || raw>100 || (command>=99.99 && err>0.1) || (command<=0.01 && err< -0.1);
            s=valvelab_model.unpack([s.time+dt opening command q pv leak integral derivative ...
                s.measuredFlow p integral d c.setpoint-pv saturated held 0]);
        end
    end
end

classdef ValveLabService < handle
    properties
        Server
        Clock
        Sim
        Model = 'valvelab_v3'
        Config
        Data
        Samples
        Count = 0
        Events = struct('id',{},'time',{},'message',{})
        ConfigHistory = struct('time',{},'config',{})
        Owner = ''
        Heartbeat = 0
        Running = false
        Busy = false
        Error = ''
        Revision = 0
        ExportCount = 0
        Root
    end
    methods
        function obj=ValveLabService()
            assert(strcmp(version('-release'),'2025b'),'ValveLab:Version','MATLAB R2025b is required.');
            obj.Root=fileparts(mfilename('fullpath'));
            obj.Model=build_valvelab_v3(); obj.Config=valvelab_model.defaults();
            obj.initialize();
            obj.Server=tcpserver('127.0.0.1',8766,'Timeout',5);
            configureTerminator(obj.Server,'LF');
            configureCallback(obj.Server,'terminator',@(src,~)obj.receive(src));
            obj.Clock=timer('Name','ValveLab v3 clock','ExecutionMode','fixedSpacing', ...
                'Period',0.05,'BusyMode','drop','TimerFcn',@(~,~)obj.tick());
            start(obj.Clock);
            fprintf('VALVELAB_READY R2025b TCP 127.0.0.1:8766\n');
        end
        function initialize(obj)
            obj.Running=false;
            if ~isempty(obj.Sim), terminate(obj.Sim); end
            v=mat2str(valvelab_model.encode(obj.Config),17);
            set_param([obj.Model '/Valve Dynamics'],'Parameters',v);
            set_param([obj.Model '/Parameters'],'Value',v);
            obj.Sim=simulation(obj.Model);
            step(obj.Sim); % Compute t=0; Simulation.Time is now the next major hit.
            obj.Samples=zeros(36001,19); obj.Count=0; obj.Events=struct('id',{},'time',{},'message',{});
            obj.ConfigHistory=struct('time',0,'config',obj.Config);
            obj.Error=''; obj.capture(); obj.Revision=obj.Revision+1;
        end
        function capture(obj)
            r=get_param([obj.Model '/Valve Dynamics'],'RuntimeObject');
            obj.Data=r.OutputPort(1).Data(:)';
            assert(all(isfinite(obj.Data)),'ValveLab:Output','Non-finite Simulink output.');
            obj.Count=obj.Count+1; obj.Samples(obj.Count,:)=obj.Data;
        end
        function advance(obj)
            if obj.Data(1)>=1800-1e-8
                obj.Running=false; obj.record('已达 1800 s 上限，请导出并重置。'); return;
            end
            step(obj.Sim); obj.capture();
        end
        function tick(obj)
            if obj.Busy, return; end
            if ~isempty(obj.Owner) && posixtime(datetime('now'))-obj.Heartbeat>3
                obj.Running=false; obj.Owner=''; obj.record('控制端心跳丢失，Simulink 已暂停。');
            end
            if ~obj.Running, return; end
            try, obj.advance();
            catch e, obj.Running=false; obj.Error=e.message; obj.record(['仿真错误：' e.message]);
            end
        end
        function record(obj,message)
            n=numel(obj.Events)+1;
            obj.Events(n)=struct('id',n,'time',obj.Data(1),'message',message);
        end
        function receive(obj,src)
            obj.Busy=true; clean=onCleanup(@()obj.unlock()); id=0;
            try
                line=readline(src); assert(strlength(line)<=16384,'ValveLab:Request','Request too large.');
                request=jsondecode(line); id=request.id;
                result=obj.dispatch(request);
                reply=struct('id',id,'ok',true,'snapshot',obj.snapshot(),'result',result);
            catch e
                reply=struct('id',id,'ok',false,'error',e.message,'snapshot',obj.snapshot());
            end
            % writeline uses ASCII; explicitly preserve Chinese messages on the wire.
            write(src,unicode2native([jsonencode(reply) newline],'UTF-8'),'uint8');
        end
        function unlock(obj), obj.Busy=false; end
        function result=dispatch(obj,r)
            result=struct(); action=r.action;
            if strcmp(action,'status'), return; end
            assert(isfield(r,'client') && ischar(r.client),'ValveLab:Client','Missing client ID.');
            now=posixtime(datetime('now'));
            if ~isempty(obj.Owner) && now-obj.Heartbeat>3
                obj.Owner=''; obj.Running=false; obj.record('控制权已过期，仿真暂停。');
            end
            if strcmp(action,'connect')
                assert(isempty(obj.Owner) || strcmp(obj.Owner,r.client),'ValveLab:Owner','另一页面正在控制；当前页面可只读观察。');
                obj.Owner=r.client; obj.Heartbeat=now; return;
            end
            assert(strcmp(obj.Owner,r.client),'ValveLab:Owner','当前页面没有控制权，请连接 MATLAB。');
            if strcmp(action,'heartbeat'), obj.Heartbeat=now; return; end
            switch action
                case 'release'
                    obj.Running=false; obj.Owner=''; obj.record('网页主动断开，Simulink 已暂停。');
                case 'configure'
                    assert(isstruct(r.patch) && isscalar(r.patch),'ValveLab:Config','Invalid parameter patch.');
                    c=obj.Config; keys=fieldnames(r.patch);
                    assert(~any(strcmp(keys,'valveId')),'ValveLab:Config','Use selectValve while paused.');
                    for n=1:numel(keys)
                        assert(isfield(c,keys{n}),'ValveLab:Config','Unknown parameter: %s',keys{n});
                        c.(keys{n})=r.patch.(keys{n});
                    end
                    if strcmp(c.mode,'manual') && strcmp(obj.Config.mode,'auto'), c.manual=obj.Data(3); end
                    valvelab_model.validate(c);
                    assert(numel(obj.ConfigHistory)<20000,'ValveLab:Limit','Parameter history limit reached; export and reset.');
                    setBlockParameter(obj.Sim,[obj.Model '/Parameters'],'Value',mat2str(valvelab_model.encode(c),17));
                    obj.Config=c; obj.Revision=obj.Revision+1;
                    obj.ConfigHistory(end+1)=struct('time',obj.Data(1),'config',c);
                    obj.record(['参数已确认：' strjoin(keys,', ')]);
                case 'run'
                    assert(isempty(obj.Error),'ValveLab:State','Reset the model after a simulation error.');
                    assert(obj.Data(1)<1800-1e-8,'ValveLab:Limit','Export and reset after 1800 seconds.');
                    obj.Running=true; obj.record('开始 Simulink 仿真');
                case 'pause'
                    obj.Running=false; obj.record('暂停 Simulink 仿真');
                case 'step'
                    assert(~obj.Running,'ValveLab:State','Pause before single stepping.'); obj.advance();
                case 'reset'
                    obj.Config.fault='none'; obj.initialize(); obj.record('重置实验');
                case 'selectValve'
                    assert(~obj.Running,'ValveLab:State','Pause before selecting a valve.');
                    c=valvelab_model.defaults(r.valveId); valvelab_model.validate(c);
                    obj.Config=c; obj.initialize(); obj.record(['选择阀门：' c.valveId]);
                case 'openModel'
                    open_system(obj.Model); result=struct('modelOpen',strcmp(get_param(obj.Model,'Open'),'on'));
                case 'openScopes'
                    for k={'Flow Scope','Position Scope','PID Scope'}, open_system([obj.Model '/' k{1}]); end
                    result=struct('scopesOpen',true);
                case 'openSDI', Simulink.sdi.view;
                case 'export', result=obj.export();
                otherwise, error('ValveLab:Action','Unsupported action.');
            end
            if strcmp(obj.Owner,r.client), obj.Heartbeat=posixtime(datetime('now')); end
        end
        function s=snapshot(obj)
            s=struct('protocol',3,'release',version('-release'),'model',obj.Model, ...
                'owner',obj.Owner,'running',obj.Running,'error',obj.Error,'revision',obj.Revision, ...
                'config',obj.Config,'state',valvelab_model.unpack(obj.Data(1:16)), ...
                'capacity',100*sqrt(max(0,obj.Config.inlet-obj.Config.outlet)), ...
                'sampleCount',obj.Count,'events',{obj.Events(max(1,end-11):end)}, ...
                'applied',struct('setpoint',obj.Data(17),'inlet',obj.Data(18),'outlet',obj.Data(19)));
        end
        function result=export(obj)
            obj.Running=false; obj.record('暂停并导出运行数据');
            root=fullfile(obj.Root,'runs'); if ~isfolder(root), mkdir(root); end
            obj.ExportCount=obj.ExportCount+1;
            tag=['valvelab_' char(datetime('now','Format','yyyyMMdd_HHmmss_SSS')) '_' num2str(obj.ExportCount)];
            base=fullfile(root,tag); assert(~isfile([base '.mat']) && ~isfile([base '.csv']),'ValveLab:Export','Export already exists.');
            run=struct('release',version('-release'),'model',obj.Model,'step',0.05, ...
                'signals',array2table(obj.Samples(1:obj.Count,:),'VariableNames',valvelab_model.signalNames()), ...
                'config',obj.Config,'configHistory',obj.ConfigHistory,'events',obj.Events);
            save([base '.mat'],'run'); writetable(run.signals,[base '.csv']);
            result=struct('mat',[base '.mat'],'csv',[base '.csv'],'samples',obj.Count);
        end
        function delete(obj)
            obj.Running=false;
            if ~isempty(obj.Clock) && isvalid(obj.Clock), stop(obj.Clock); delete(obj.Clock); end
            if ~isempty(obj.Server), configureCallback(obj.Server,'off'); obj.Server=[]; end
            if ~isempty(obj.Sim), terminate(obj.Sim); end
        end
    end
end

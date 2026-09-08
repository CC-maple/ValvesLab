classdef ValveLabServiceV31 < handle
    properties
        Server
        Clock
        Sim
        Model = 'valvelab_v31'
        Config
        AppliedConfig
        Data
        Samples
        Count = 0
        Events = struct('id',{},'time',{},'message',{},'revision',{},'acceptedTime',{},'appliedTime',{},'phase',{})
        ConfigHistory = struct('revision',{},'acceptedTime',{},'appliedTime',{},'status',{},'config',{})
        Owner = ''
        Heartbeat = 0
        Running = false
        Busy = false
        Error = ''
        Revision = 0
        AppliedRevision = 0
        AppliedTime = 0
        Sequence = 0
        SessionId
        ExportCount = 0
        Root
        RunName = '自由实验'
        RunID
        SavedRuns = struct('id',{},'name',{},'samples',{},'duration',{})
        Plan = struct('time',{},'patch',{})
        LessonId = 'free'
        RunLesson = 'free'
        LessonEnd = 30
        Waveform = struct('group','flow','span',20,'mode','live','yMode','auto','pidLayout','split','from',0,'to',5)
        WaveActive = false
        AnalysisFigure
        SensorFigure
    end
    methods
        function obj=ValveLabServiceV31(port)
            if nargin==0, port=8776; end
            assert(strcmp(version('-release'),'2025b'),'ValveLab:Version','MATLAB R2025b is required.');
            obj.Root=fileparts(mfilename('fullpath'));
            obj.SessionId=char(java.util.UUID.randomUUID);
            obj.Model=build_valvelab_v31(); obj.Config=valvelab_model_v31.defaults();
            % Initialize MATLAB graphics before entering stepped Simulink execution.
            obj.AnalysisFigure=figure('Name','ValveLab | Recorded analysis','Visible','off','WindowStyle','normal', ...
                'Position',[150 100 1080 850],'CloseRequestFcn',@(f,~)set(f,'Visible','off'));
            axes(obj.AnalysisFigure);
            obj.SensorFigure=figure('Name','ValveLab | Sensor response','Visible','off','WindowStyle','normal', ...
                'CloseRequestFcn',@(f,~)set(f,'Visible','off'));
            axes(obj.SensorFigure); drawnow;
            files=dir(fullfile(obj.Root,'runs','v3.1','*.mat'));
            for n=1:numel(files)
                data=load(fullfile(files(n).folder,files(n).name),'run');
                [~,id]=fileparts(files(n).name); r=data.run;
                obj.SavedRuns(end+1)=struct('id',id,'name',r.name,'samples',height(r.signals),'duration',r.signals.time(end));
            end
            obj.initialize();
            obj.Server=tcpserver('127.0.0.1',port,'Timeout',5);
            configureTerminator(obj.Server,'LF'); configureCallback(obj.Server,'terminator',@(src,~)obj.receive(src));
            obj.Clock=timer('Name','ValveLab V3.1 clock','ExecutionMode','fixedSpacing', ...
                'Period',0.05,'BusyMode','drop','TimerFcn',@(~,~)obj.tick());
            start(obj.Clock); fprintf('VALVELAB_READY V3.1 R2025b TCP 127.0.0.1:%d\n',port);
        end
        function initialize(obj)
            obj.Running=false; obj.Plan=struct('time',{},'patch',{}); obj.LessonId='free'; obj.RunLesson='free';
            if ~isempty(obj.Sim), terminate(obj.Sim); end
            obj.Revision=obj.Revision+1;
            v=mat2str([valvelab_model_v31.encode(obj.Config) obj.Revision],17);
            set_param([obj.Model '/Valve Dynamics'],'Parameters',v); set_param([obj.Model '/Parameters'],'Value',v);
            obj.Samples=zeros(36001,20); obj.Count=0;
            obj.Events=struct('id',{},'time',{},'message',{},'revision',{},'acceptedTime',{},'appliedTime',{},'phase',{});
            obj.ConfigHistory=struct('revision',obj.Revision,'acceptedTime',0,'appliedTime',NaN,'status','accepted','config',obj.Config);
            obj.Error=''; obj.AppliedRevision=0;
            ids=Simulink.sdi.getAllRunIDs; obj.Sim=simulation(obj.Model); step(obj.Sim); obj.capture();
            created=setdiff(Simulink.sdi.getAllRunIDs,ids);
            assert(~isempty(created),'ValveLab:Logging','Simulink did not create a logged run.');
            obj.RunID=created(end); run=Simulink.sdi.getRun(obj.RunID); run.Name=obj.RunName;
            if obj.WaveActive
                obj.Waveform.mode='live'; valvelab_scope_v31(obj.Model,obj.Waveform,obj.Samples(1:obj.Count,:),true);
            end
        end
        function capture(obj)
            r=get_param([obj.Model '/Valve Dynamics'],'RuntimeObject'); obj.Data=r.OutputPort(1).Data(:)';
            assert(numel(obj.Data)==20 && all(isfinite(obj.Data)),'ValveLab:Output','Invalid Simulink telemetry.');
            obj.Count=obj.Count+1; obj.Samples(obj.Count,:)=obj.Data;
            rev=obj.Data(20);
            if rev~=obj.AppliedRevision
                index=find([obj.ConfigHistory.revision]==rev,1);
                assert(~isempty(index),'ValveLab:Revision','Unknown applied Simulink revision.');
                obj.AppliedRevision=rev; obj.AppliedTime=obj.Data(1); obj.AppliedConfig=obj.ConfigHistory(index).config;
                obj.ConfigHistory(index).appliedTime=obj.Data(1); obj.ConfigHistory(index).status='applied';
                for n=1:numel(obj.ConfigHistory)
                    if obj.ConfigHistory(n).revision<rev && strcmp(obj.ConfigHistory(n).status,'accepted'), obj.ConfigHistory(n).status='superseded'; end
                end
                for n=1:numel(obj.Events)
                    if strcmp(obj.Events(n).phase,'accepted')
                        if obj.Events(n).revision==rev
                            obj.Events(n).appliedTime=obj.Data(1); obj.Events(n).phase='applied';
                        elseif obj.Events(n).revision<rev, obj.Events(n).phase='superseded'; end
                    end
                end
            end
        end
        function advance(obj)
            if obj.Data(1)>=1800-1e-8, obj.Running=false; obj.record('已达 1800 s 上限，请保存并开始新实验。'); return; end
            next=obj.Data(1)+.05;
            while ~isempty(obj.Plan) && obj.Plan(1).time<=next+1e-8
                obj.configure(obj.Plan(1).patch); obj.Plan(1)=[];
            end
            step(obj.Sim); obj.capture();
            if obj.WaveActive && mod(obj.Count,5)==0
                valvelab_scope_v31(obj.Model,obj.Waveform,obj.Samples(1:obj.Count,:),false);
            end
            if ~strcmp(obj.LessonId,'free') && obj.Data(1)>=obj.LessonEnd-1e-8
                obj.Running=false; obj.record('课程完成，已在 30 s 暂停；可保存或准备下一次对照。'); obj.LessonId='free';
            end
        end
        function tick(obj)
            if obj.Busy, return; end
            if ~isempty(obj.Owner) && posixtime(datetime('now'))-obj.Heartbeat>3
                obj.Running=false; obj.Owner=''; obj.record('控制端心跳丢失，Simulink 已暂停。');
            end
            if ~obj.Running, return; end
            try, obj.advance(); catch e, obj.Running=false; obj.Error=e.message; obj.record(['仿真错误：' e.message]); end
        end
        function record(obj,message,phase,revision)
            if nargin<3, phase='info'; end
            if nargin<4, revision=obj.AppliedRevision; end
            n=numel(obj.Events)+1;
            obj.Events(n)=struct('id',n,'time',obj.Data(1),'message',message,'revision',revision, ...
                'acceptedTime',obj.Data(1),'appliedTime',NaN,'phase',phase);
        end
        function configure(obj,patch)
            assert(isstruct(patch) && isscalar(patch),'ValveLab:Config','参数修改必须是对象。');
            c=obj.Config; keys=fieldnames(patch);
            assert(~any(strcmp(keys,'valveId')),'ValveLab:Config','切换阀门请先暂停并使用阀门选择。');
            for n=1:numel(keys)
                assert(isfield(c,keys{n}),'ValveLab:Config','未知参数：%s',keys{n}); c.(keys{n})=patch.(keys{n});
            end
            if strcmp(c.mode,'manual') && strcmp(obj.Config.mode,'auto') && ~isfield(patch,'manual'), c.manual=obj.Data(3); end
            valvelab_model_v31.validate(c);
            if isequal(c,obj.Config), return; end
            assert(numel(obj.ConfigHistory)<20000,'ValveLab:Limit','参数历史已满，请保存并开始新实验。');
            revision=obj.Revision+1;
            setBlockParameter(obj.Sim,[obj.Model '/Parameters'],'Value',mat2str([valvelab_model_v31.encode(c) revision],17));
            description=valvelab_describe_patch(obj.Config,c);
            obj.Config=c; obj.Revision=revision;
            obj.ConfigHistory(end+1)=struct('revision',revision,'acceptedTime',obj.Data(1),'appliedTime',NaN,'status','accepted','config',c);
            obj.record(description,'accepted',revision);
        end
        function receive(obj,src)
            obj.Busy=true; clean=onCleanup(@()obj.unlock()); id=0; %#ok<NASGU>
            try
                line=native2unicode(uint8(char(readline(src))),'UTF-8'); assert(strlength(line)<=16384,'ValveLab:Request','Request too large.');
                request=jsondecode(line); id=request.id; result=obj.dispatch(request);
                reply=struct('id',id,'ok',true,'snapshot',obj.snapshot(),'result',result);
            catch e
                fprintf(2,'%s\n',getReport(e,'extended','hyperlinks','off'));
                reply=struct('id',id,'ok',false,'error',e.message,'snapshot',obj.snapshot());
            end
            write(src,unicode2native([jsonencode(reply) newline],'UTF-8'),'uint8');
        end
        function unlock(obj), obj.Busy=false; end
        function result=dispatch(obj,r)
            result=struct(); action=r.action;
            if strcmp(action,'status'), return; end
            assert(isfield(r,'client') && ischar(r.client),'ValveLab:Client','缺少客户端标识。');
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
            % The timer must not declare an authorized long UI operation disconnected.
            heartbeatCleanup=onCleanup(@()obj.refreshHeartbeat(r.client)); %#ok<NASGU>
            switch action
                case 'release'
                    obj.Running=false; obj.Owner=''; obj.record('网页主动断开，Simulink 已暂停。');
                case 'configure'
                    obj.configure(r.patch);
                    if ~strcmp(obj.LessonId,'free')
                        obj.Plan=struct('time',{},'patch',{}); obj.LessonId='free'; obj.record('手动调参：已取消剩余课程事件与自动暂停。');
                    end
                case 'run'
                    assert(isempty(obj.Error),'ValveLab:State','仿真发生错误，请先保存并开始新实验。');
                    assert(obj.Data(1)<1800-1e-8,'ValveLab:Limit','已达 1800 s，请保存并开始新实验。');
                    obj.Waveform.mode='live';
                    if obj.WaveActive, valvelab_scope_v31(obj.Model,obj.Waveform,obj.Samples(1:obj.Count,:),true); end
                    obj.Running=true; obj.record('开始 Simulink 仿真');
                case 'pause'
                    obj.Running=false; obj.record('暂停 Simulink 仿真');
                case 'step'
                    assert(~obj.Running,'ValveLab:State','请先暂停再单步。'); obj.advance();
                case 'reset'
                    assert(~obj.Running,'ValveLab:State','请先暂停再开始新实验。');
                    result=obj.preserve(); obj.Config.fault='none'; obj.RunName='自由实验'; obj.initialize(); obj.record('新实验：保留参数、清除故障，初始阀位 65%。');
                case 'selectValve'
                    assert(~obj.Running,'ValveLab:State','请先暂停再切换阀门。');
                    c=valvelab_model_v31.defaults(r.valveId); valvelab_model_v31.validate(c);
                    result=obj.preserve(); obj.Config=c; obj.RunName='自由实验'; obj.initialize(); obj.record(['选择阀门：' c.valveId]);
                case 'prepareLesson'
                    assert(~obj.Running,'ValveLab:State','请先暂停再准备课程。');
                    [c,plan,name,group]=valvelab_lesson_v31(r.lessonId,obj.Config);
                    result=obj.preserve(); obj.Config=c; obj.RunName=name; obj.Waveform.group=group; obj.initialize();
                    obj.Plan=plan; obj.LessonId=r.lessonId; obj.RunLesson=r.lessonId;
                    obj.record(['已准备 ' name '；点击开始，按固定仿真时刻执行。']);
                case 'cancelLesson'
                    obj.Plan=struct('time',{},'patch',{}); obj.LessonId='free'; obj.record('已切换自由实验，取消剩余课程事件与自动暂停。');
                case 'sensorLesson'
                    result=valvelab_sensor_lesson(obj.Config.sensorTau,true,obj.SensorFigure);
                case 'openModel'
                    open_system(obj.Model); result=struct('modelOpen',strcmp(get_param(obj.Model,'Open'),'on'));
                case 'openScopes'
                    w=obj.Waveform; if isfield(r,'waveform'), w=r.waveform; end
                    valvelab_validate_waveform(w,obj.Data(1),obj.Running);
                    limits=valvelab_scope_v31(obj.Model,w,obj.Samples(1:obj.Count,:),true);
                    obj.Waveform=w; obj.WaveActive=true; result=struct('scopesOpen',true,'limits',limits);
                case 'openSDI'
                    valvelab_sdi_v31(obj.RunID,[],obj.Waveform.group); result=struct('sdiOpen',true);
                case 'openAnalysis'
                    obj.Running=false; f=analyze_valvelab_v31(obj.runData(),true,obj.AnalysisFigure); result=struct('analysisOpen',isgraphics(f));
                case 'compareRun'
                    assert(ischar(r.runId) && any(strcmp(r.runId,{obj.SavedRuns.id})),'ValveLab:Run','请选择已保存的 V3.1 实验。');
                    obj.Running=false; data=load(fullfile(obj.Root,'runs','v3.1',[r.runId '.mat']),'run');
                    current=valvelab_import_run_v31(obj.runData());
                    imported=valvelab_import_run_v31(data.run); valvelab_sdi_v31(current,imported,'all',true);
                    obj.record(['对比记录：' data.run.name]); result=struct('comparisonOpen',true);
                case 'export'
                    if isfield(r,'name'), obj.validateName(r.name); obj.RunName=r.name; run=Simulink.sdi.getRun(obj.RunID); run.Name=r.name; end
                    result=obj.export();
                otherwise, error('ValveLab:Action','不支持的操作。');
            end
        end
        function refreshHeartbeat(obj,client)
            if strcmp(obj.Owner,client), obj.Heartbeat=posixtime(datetime('now')); end
        end
        function s=snapshot(obj)
            obj.Sequence=obj.Sequence+1; next=NaN; if ~isempty(obj.Plan), next=obj.Plan(1).time; end
            s=struct('protocol',31,'release',version('-release'),'model',obj.Model,'sequence',obj.Sequence,'sessionId',obj.SessionId, ...
                'owner',obj.Owner,'running',obj.Running,'error',obj.Error,'revision',obj.Revision, ...
                'appliedRevision',obj.AppliedRevision,'appliedTime',obj.AppliedTime,'appliedConfig',obj.AppliedConfig, ...
                'config',obj.Config,'state',valvelab_model_v31.unpack(obj.Data(1:16)), ...
                'capacity',100*sqrt(max(0,obj.Config.inlet-obj.Config.outlet)), ...
                'sampleCount',obj.Count,'events',{obj.Events(max(1,end-19):end)}, ...
                'applied',struct('setpoint',obj.Data(17),'inlet',obj.Data(18),'outlet',obj.Data(19)), ...
                'runName',obj.RunName,'runId',obj.RunID,'savedRuns',{obj.SavedRuns(max(1,end-29):end)},'waveform',obj.Waveform, ...
                'lesson',struct('id',obj.LessonId,'nextTime',next,'remaining',numel(obj.Plan),'endTime',obj.LessonEnd));
        end
        function r=runData(obj)
            r=struct('version','3.1','name',obj.RunName,'release',version('-release'),'model',obj.Model,'step',.05, ...
                'signals',array2table(obj.Samples(1:obj.Count,:),'VariableNames',valvelab_model_v31.signalNames()), ...
                'config',obj.Config,'appliedConfig',obj.AppliedConfig,'configHistory',obj.ConfigHistory,'events',obj.Events, ...
                'lesson',obj.RunLesson,'remainingPlan',obj.Plan,'waveform',obj.Waveform);
        end
        function result=preserve(obj)
            result=struct();
            if obj.Count>1 || numel(obj.ConfigHistory)>1, result=obj.export(); end
        end
        function result=export(obj)
            obj.Running=false; obj.record('暂停并保存运行数据与参数快照');
            root=fullfile(obj.Root,'runs','v3.1'); if ~isfolder(root), mkdir(root); end
            obj.ExportCount=obj.ExportCount+1;
            tag=['valvelab_' char(datetime('now','Format','yyyyMMdd_HHmmss_SSS')) '_' num2str(obj.ExportCount)];
            base=fullfile(root,tag); assert(~isfile([base '.mat']) && ~isfile([base '.csv']),'ValveLab:Export','Export already exists.');
            run=obj.runData(); save([base '.mat'],'run'); writetable(run.signals,[base '.csv']);
            obj.SavedRuns(end+1)=struct('id',tag,'name',obj.RunName,'samples',obj.Count,'duration',obj.Data(1));
            result=struct('mat',[base '.mat'],'csv',[base '.csv'],'samples',obj.Count,'id',tag);
        end
        function delete(obj)
            obj.Running=false;
            if ~isempty(obj.Clock) && isvalid(obj.Clock), stop(obj.Clock); delete(obj.Clock); end
            if ~isempty(obj.Server), configureCallback(obj.Server,'off'); obj.Server=[]; end
            if ~isempty(obj.Sim), terminate(obj.Sim); end
            if ~isempty(obj.AnalysisFigure) && isgraphics(obj.AnalysisFigure), delete(obj.AnalysisFigure); end
            if ~isempty(obj.SensorFigure) && isgraphics(obj.SensorFigure), delete(obj.SensorFigure); end
        end
    end
    methods (Static)
        function validateName(name)
            assert(ischar(name) && isrow(name) && ~isempty(strtrim(name)) && strlength(name)<=60 && ~any(double(name)<32), ...
                'ValveLab:Name','实验名称需要 1～60 个可显示字符。');
        end
    end
end

function valvelab_sfun(block)
% State is owned by Simulink DWork, never by the browser or a MATLAB timer.
block.NumDialogPrms=1;
block.DialogPrmsTunable={'Nontunable'};
block.NumInputPorts=1; block.NumOutputPorts=1;
block.SetPreCompInpPortInfoToDynamic; block.SetPreCompOutPortInfoToDynamic;
block.InputPort(1).Dimensions=16; block.InputPort(1).DirectFeedthrough=true;
block.OutputPort(1).Dimensions=19;
block.SampleTimes=[0.05 0]; block.SimStateCompliance='DefaultSimState';
block.RegBlockMethod('PostPropagationSetup',@work);
block.RegBlockMethod('InitializeConditions',@initialize);
block.RegBlockMethod('Outputs',@outputs);
block.RegBlockMethod('Update',@update);
end
function work(b)
b.NumDworks=2;
for n=1:2
    b.Dwork(n).Name=['state' num2str(n)]; b.Dwork(n).Dimensions=16;
    b.Dwork(n).DatatypeID=0; b.Dwork(n).Complexity='Real'; b.Dwork(n).UsedAsDiscState=true;
end
end
function initialize(b)
c=valvelab_model.decode(b.DialogPrm(1).Data);
b.Dwork(1).Data=valvelab_model.pack(valvelab_model.initial(c))';
b.Dwork(2).Data=valvelab_model.encode(c)';
end
function outputs(b)
c=valvelab_model.decode(b.InputPort(1).Data);
s=valvelab_model.unpack(b.Dwork(1).Data);
if b.CurrentTime>0
    s=valvelab_model.advance(s,valvelab_model.decode(b.Dwork(2).Data),c,0.05);
end
s.time=b.CurrentTime;
b.OutputPort(1).Data=[valvelab_model.pack(s) c.setpoint c.inlet c.outlet]';
end
function update(b)
b.Dwork(1).Data=b.OutputPort(1).Data(1:16);
b.Dwork(2).Data=b.InputPort(1).Data;
end

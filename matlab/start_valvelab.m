function service=start_valvelab()
% Run once in the MATLAB desktop. Keep the returned handle alive.
persistent instance
assert(isempty(instance) || ~isvalid(instance),'ValveLab:Running','ValveLab service is already running in this MATLAB session.');
addpath(fileparts(mfilename('fullpath')));
instance=ValveLabServiceV31(); service=instance;
assignin('base','valvelab_service',service);
end

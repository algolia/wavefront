default['wavefront'] = {}
default['wavefront']['prefix'] = nil
default['wavefront']['server'] = 'https://try.wavefront.com/api'
default['wavefront']['hostname'] = node['hostname']
default['wavefront']['token'] = ''
default['wavefront']['pushListenerPorts'] = 2878
default['wavefront']['pushFlushMaxPoints'] = 40000
default['wavefront']['pushFlushInterval'] = 1000
default['wavefront']['pushBlockedSamples'] = 5
default['wavefront']['pushLogLevel'] = 'SUMMARY'
default['wavefront']['pushValidationLevel'] = 'NUMERIC_ONLY'
default['wavefront']['graphitePorts'] = 2100
default['wavefront']['graphiteFormat'] = 2
default['wavefront']['graphiteDelimiters'] = '_'
default['wavefront']['idFile'] = '/opt/wavefront/wavefront-proxy/.wavefront_id'
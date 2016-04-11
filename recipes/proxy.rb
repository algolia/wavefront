#
# Cookbook Name:: wavefront
# Recipe:: default
#
# Copyright (c) 2016 Adam Surak, All Rights Reserved.

apt_repository 'wavefront_proxy' do
	uri          'https://packagecloud.io/wavefront/proxy/ubuntu/'
	distribution node['lsb']['codename']
	components   ['main']
	key          'https://packagecloud.io/wavefront/proxy/gpgkey'
	deb_src true
end

package 'wavefront-proxy' do
  action :upgrade
end

template '/opt/wavefront/wavefront-proxy/conf/wavefront.conf' do
  source 'wavefront.conf.erb'
  owner 'wavefront'
  group 'wavefront'
  mode '0644'
  notifies :restart, 'service[wavefront-proxy]'
end

service 'wavefront-proxy' do
  supports :status => true, :restart => true
  action [:start, :enable]
end

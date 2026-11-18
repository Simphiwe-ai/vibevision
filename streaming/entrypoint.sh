#!/bin/sh
set -eu
: "${RTMP_CALLBACK_SECRET:?RTMP_CALLBACK_SECRET is not set}"
envsubst '${RTMP_CALLBACK_SECRET}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'

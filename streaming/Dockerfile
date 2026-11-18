FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx libnginx-mod-rtmp gettext-base \
 && rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
 && mkdir -p /var/www/hls \
 && chown www-data /var/www/hls

EXPOSE 1935 80
ENTRYPOINT ["/entrypoint.sh"]

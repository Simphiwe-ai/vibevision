FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx libnginx-mod-rtmp \
 && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
RUN mkdir -p /var/www/hls && chown www-data /var/www/hls

EXPOSE 1935 80
CMD ["nginx", "-g", "daemon off;"]

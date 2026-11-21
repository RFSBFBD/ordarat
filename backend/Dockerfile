FROM ad_platform-backend:latest

WORKDIR /app

COPY . /app

RUN chmod -R 777 /app/storage /app/bootstrap/cache

ENV PORT=8080
EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "-t", "/app/public"]

FROM python:3.12-slim

EXPOSE 8080

WORKDIR /usr/src/app

ENV FLASK_ENV=production

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD [ "waitress-serve", "--listen=0.0.0.0:8080", "--threads=2", "backend:app" ]

# Verwende das offizielle Node.js 18-Image als Basis
FROM node:18

# Setze das Arbeitsverzeichnis im Container
WORKDIR /usr/src/app

# Kopiere package.json und package-lock.json (falls vorhanden)
COPY package*.json ./

# Installiere die Abhängigkeiten
RUN npm install

# Kopiere den Rest des Anwendungscodes, einschließlich des 'services'-Verzeichnisses
COPY . .

# Überprüfe den Inhalt von consumer.js
RUN echo "Inhalt von consumer.js nach dem Kopieren:" && cat /usr/src/app/consumer.js

# Definiere den Befehl zum Starten der Anwendung
CMD ["node", "consumer.js"]

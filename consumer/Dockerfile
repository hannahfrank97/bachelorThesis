FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Checking the content of consumer.js after copying
RUN echo "Content of consumer.js after copying:" && cat /usr/src/app/consumer.js

CMD ["node", "consumer.js"]

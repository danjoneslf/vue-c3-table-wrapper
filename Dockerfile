FROM node:latest
RUN apt-get update -qq
RUN apt-get install -y wget curl tar gzip firefox-esr
RUN npm install -g vue-cli
WORKDIR /usr/src
COPY . /usr/src
RUN npm install --include=dev

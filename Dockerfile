FROM node:22-alpine

WORKDIR /app

RUN apk add python3 python3-dev py3-pip ffmpeg 
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/bin/yt-dlp
RUN chmod a+rx /usr/bin/yt-dlp
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build
RUN pnpm store prune

CMD ["pnpm", "run", "preview", "--host"]

EXPOSE 4173 5901
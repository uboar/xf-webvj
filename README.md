# xf-webvj

## Run Docker
```bash
docker run -p 4173:4173 -p 5901:5901 -v $(pwd)/videos:/app/static/videos uboar/xf-webvj
```

## Run Local
```bash
npm install -g pnpm
pnpm install
pnpm build
pnpm preview
```
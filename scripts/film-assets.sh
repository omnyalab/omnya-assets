#!/usr/bin/env bash
# Prepara i file di un film per il sito (stessa ricetta di Ca' dei Colli).
# Uso: scripts/film-assets.sh master.mp4 16_samar samar "4,12,20,28,36,44,52" [lufs]
#  - master.mp4: il film finito, con audio
#  - 16_samar:   cartella in public/projects (id del progetto)
#  - samar:      prefisso dei file
#  - tempi:      secondi da cui prendere i fotogrammi; il primo fa da cover e poster, gli altri la galleria
#  - lufs:       volume della musica, default -24 (basso; il web di solito sta a -14/-16)
# Stampa alla fine il blocco JSON da mettere in src/data/projects.json.
set -euo pipefail
SRC="$1"; ID="$2"; NAME="$3"; TIMES="$4"; LUFS="${5:--24}"
OUT="public/projects/$ID"; mkdir -p "$OUT"
W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$SRC")
STILL_W=$(( W < 2400 ? W : 2400 ))

enc() { # $1 altezza, $2 crf, $3 kbps audio, $4 suffisso
  ffmpeg -hide_banner -loglevel error -y -i "$SRC" \
    -vf "scale=-2:$1:flags=lanczos" -c:v libx264 -preset slow -crf "$2" -pix_fmt yuv420p \
    -af "loudnorm=I=$LUFS:TP=-2:LRA=11" -c:a aac -b:a "${3}k" -ar 48000 \
    -movflags +faststart "$OUT/${NAME}_video_01_$4.mp4"
}
enc 1080 24 128 1080
enc 720 26 96 720

frame() { # $1 secondi, $2 larghezza, $3 file
  ffmpeg -hide_banner -loglevel error -y -ss "$1" -i "$SRC" -frames:v 1 \
    -vf "scale=$2:-2:flags=lanczos" -c:v libwebp -quality 82 "$3"
}
IFS=',' read -ra T <<< "$TIMES"
frame "${T[0]}" 1920 "$OUT/${NAME}_video_01_poster.webp"
frame "${T[0]}" "$STILL_W" "$OUT/${NAME}_cover.webp"
frame "${T[0]}" 1200 "$OUT/${NAME}_cover_mobile.webp"
i=0
for t in "${T[@]:1}"; do
  i=$((i+1)); n=$(printf %02d $i)
  frame "$t" "$STILL_W" "$OUT/${NAME}_gallery_${n}.webp"
  frame "$t" 1200 "$OUT/${NAME}_gallery_${n}_mobile.webp"
done

du -sh "$OUT"/* | sed 's#public/projects/##'

# Blocco JSON con le misure vere dei file.
node -e '
const {execSync}=require("child_process");
const [id,name,n]=process.argv.slice(1);
const dim=f=>{const [w,h]=execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 public/projects/${id}/${f}`).toString().trim().split(",").map(Number);return {w,h,orientation:w>=h?"horizontal":"vertical"};};
const still=b=>({src:`/projects/${id}/${b}.webp`,mobile:`/projects/${id}/${b}_mobile.webp`,...dim(`${b}.webp`)});
const g=[];for(let i=1;i<=n;i++)g.push(still(`${name}_gallery_${String(i).padStart(2,"0")}`));
console.log(JSON.stringify({id,title:"",category:"luxury",film:true,subtitles:false,featured:true,cover:still(`${name}_cover`),gallery:g,videos:[{desktop:`/projects/${id}/${name}_video_01_1080.mp4`,mobile:`/projects/${id}/${name}_video_01_720.mp4`,poster:`/projects/${id}/${name}_video_01_poster.webp`}]},null,2));
' "$ID" "$NAME" "$i"

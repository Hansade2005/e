#!/usr/bin/env bash
# Turn the recorded Playwright .webm into a compact, shareable .mp4 with an
# embedded poster thumbnail. Usage: bash e2e/transcode-demo.sh
set -euo pipefail

SRC=$(ls e2e/video/*.webm | head -1)
OUT="e2e/ez2go-demo.mp4"
POSTER="e2e/video/_poster.png"

echo "source: $SRC"

# Poster frame — a branded early moment for the embedded thumbnail.
ffmpeg -y -loglevel error -ss 3.5 -i "$SRC" -frames:v 1 "$POSTER"

# H.264, CRF 30 keeps it small; faststart for instant web playback; the PNG
# is muxed as an attached_pic so players show a thumbnail.
ffmpeg -y -loglevel error -i "$SRC" -i "$POSTER" \
  -map 0:v:0 -map 1:v:0 \
  -c:v:0 libx264 -crf 30 -preset veryslow -pix_fmt yuv420p -movflags +faststart \
  -c:v:1 png -disposition:v:1 attached_pic \
  "$OUT"

rm -f "$POSTER"
ls -la "$OUT"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT"

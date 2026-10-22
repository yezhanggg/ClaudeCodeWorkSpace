#!/bin/sh
# Final renders: 1080p30 MP4 frames (4 motion-blur samples), then 720px 25 fps frames for the GIF.
set -e
cd "$(dirname "$0")"
node render.mjs --frames --fps=30 --w=1920 --samples=4 --workers=2 --dir=out/frames30
ffmpeg -y -loglevel error -framerate 30 -i out/frames30/f%05d.png -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart out/puff_cloud_10s.mp4
echo "MP4 done"
node render.mjs --frames --fps=25 --w=720 --samples=4 --grain=0.006 --workers=2 --dir=out/frames25
echo "GIF frames done"

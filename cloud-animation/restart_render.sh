#!/bin/sh
# Kill any running renderer and browser (never this script's own shell), clear old frames, start the final render.
cd "$(dirname "$0")"
for p in $(pgrep -f 'node render.mjs'); do [ "$p" != "$$" ] && kill -9 "$p" 2>/dev/null; done
for p in $(pgrep -f 'chrome-linux'); do kill -9 "$p" 2>/dev/null; done
sleep 2
echo "renderers left: $(pgrep -fc 'node render.mjs')  browsers left: $(pgrep -fc 'chrome-linux')"
rm -rf out/frames30 out/frames25
nohup ./run_final.sh > out/render_log.txt 2>&1 &
sleep 12
cat out/render_log.txt

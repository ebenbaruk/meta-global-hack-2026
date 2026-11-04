#!/usr/bin/env bash
# Renders the demo video end to end: voiceover → slides → screen capture → edit.
#
#   video/build.sh            live Meta API (final render), production server on :3131
#   video/build.sh --mock     mock mode (META_MOCK=1) on :3130, for iteration
#   video/build.sh --edit     re-cut only, reusing the last capture
#
# Output: video/out/feedforward-demo.mp4 (+ timeline.json, frames/ for QA)
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-live}"
mkdir -p video/out

npx tsx scripts/video-vo.ts
npx tsx scripts/video-slides.ts

if [[ "$MODE" != "--edit" ]]; then
  if [[ "$MODE" == "--mock" ]]; then
    PORT=3130; export META_MOCK=1; DIST=.next-video
  else
    PORT=3131; unset META_MOCK || true; DIST=.next-video-live
  fi
  # Production build: a dev server would hot-reload the page mid-recording whenever a file changes.
  NEXT_DIST_DIR=$DIST npx next build --no-lint > video/out/server-build.log 2>&1 || { tail -30 video/out/server-build.log; exit 1; }
  NEXT_DIST_DIR=$DIST npx next start -p $PORT > video/out/server.log 2>&1 &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null || true; pkill -f "next start -p $PORT" 2>/dev/null || true' EXIT
  for _ in $(seq 1 90); do curl -sf -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
  npx tsx scripts/demo.ts --url "http://localhost:$PORT" --pass both
  kill $SERVER 2>/dev/null || true
  pkill -f "next start -p $PORT" 2>/dev/null || true
fi

npx tsx scripts/video-edit.ts

rm -rf video/out/frames && mkdir -p video/out/frames
ffmpeg -v error -i video/out/feedforward-demo.mp4 -vf "fps=1/5,scale=960:-1" video/out/frames/f%03d.png
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact video/out/feedforward-demo.mp4

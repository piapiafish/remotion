#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run agent:plan -- --brief '智能分析；自动规划；精彩呈现' --media assets/demo.mp4 --shots 3
npm run agent:validate
npm run agent:render -- --storyboard work/storyboard.json --out output

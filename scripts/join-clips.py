"""Join exported silent shots, optionally adding a local music track. Python 3.10+, FFmpeg."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

def probe(file):
    result = subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)], check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    video = next((s for s in data['streams'] if s['codec_type'] == 'video'), None)
    if not video:
        raise ValueError('No video stream: ' + str(file))
    return video, float(data['format']['duration'])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('clips', nargs='+', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--music', type=Path)
    parser.add_argument('--overwrite', action='store_true')
    args = parser.parse_args()
    clips = [p.resolve() for p in args.clips]
    output = args.output.resolve()
    if output in clips or (args.music and output == args.music.resolve()):
        raise ValueError('Output must be different from every input')
    if output.exists() and not args.overwrite:
        raise ValueError('Output already exists; choose a new path or use --overwrite')
    if output.suffix.lower() != '.mp4':
        raise ValueError('Output must end in .mp4')
    descriptions = [probe(p) for p in clips]
    sizes = {(s['width'], s['height'], s['r_frame_rate']) for s, _ in descriptions}
    if len(sizes) != 1:
        raise ValueError('Clips must use the same dimensions and frame rate; export matching settings first')
    if args.music and not args.music.is_file():
        raise ValueError('Music file does not exist')
    output.parent.mkdir(parents=True, exist_ok=True)
    duration = sum(d for _, d in descriptions)
    with tempfile.TemporaryDirectory(prefix='join-clips-', dir=output.parent) as folder:
        tmp = Path(folder)
        listing = tmp/'clips.txt'
        def quote(p):
            return str(p).replace('\\','/').replace("'", "'\\''")
        listing.write_text(''.join("file '"+quote(p)+"'\n" for p in clips), encoding='utf-8')
        command = ['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing)]
        if args.music:
            command += ['-stream_loop','-1','-i',str(args.music.resolve()),'-map','0:v:0','-map','1:a:0','-c:a','aac','-b:a','192k']
        else:
            command += ['-an']
        command += ['-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-t',str(duration),'-movflags','+faststart',str(tmp/'joined.mp4')]
        subprocess.run(command, check=True)
        final, seconds = probe(tmp/'joined.mp4')
        os.replace(tmp/'joined.mp4', output)
    print(json.dumps({'status':'PASS','output':str(output),'width':final['width'],'height':final['height'],'seconds':seconds,'shots':len(clips),'music':bool(args.music)}, ensure_ascii=True))

if __name__ == '__main__':
    try:
        main()
    except (ValueError, StopIteration, OSError, subprocess.CalledProcessError) as error:
        print(json.dumps({'status':'ERROR','error':str(error)}, ensure_ascii=True))
        raise SystemExit(1)


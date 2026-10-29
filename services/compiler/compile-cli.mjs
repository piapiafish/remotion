import {readFileSync} from 'node:fs';
import {compileShot} from './compile.mjs';
const obj=JSON.parse(readFileSync(0,'utf8'));
const {shot,canvas,assetInfo,publicUrl}=obj;
const board={schemaVersion:'0.1.0',canvas,assets:[{id:'screen',kind:assetInfo.kind,uri:'assets/input.mp4'}],shots:[{...shot,screenAssetId:'screen'}],overlays:[]};
process.stdout.write(JSON.stringify(compileShot(board,board.shots[0],assetInfo,publicUrl)));

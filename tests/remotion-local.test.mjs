import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {readInterfaces}=createRequire(import.meta.url)('../scripts/remotion-loopback.cjs');
test('Remotion keeps readable interfaces and falls back only on denied enumeration',()=>{
 const normal={eth0:[]};assert.equal(readInterfaces(()=>normal),normal);
 const denied=Object.assign(new Error('denied'),{errno:1,syscall:'uv_interface_addresses'});
 const local=readInterfaces(()=>{throw denied},()=>{});
 assert.equal(local.lo[0].address,'127.0.0.1');assert.equal(local.lo[0].internal,true);
 const unknown=new Error('unrelated failure');
 assert.throws(()=>readInterfaces(()=>{throw unknown}),error=>error===unknown);
});

// Remotion 4.0.300 enumerates host interfaces even for a local render. Some
// containers deny that read. Use only the already-known IPv4 loopback there;
// no permissions, network access, or dependency files are modified.
const os = require('node:os');

function readInterfaces(read, warn = console.warn) {
  try { return read(); }
  catch (error) {
    if (error.syscall !== 'uv_interface_addresses' || ![1, 13].includes(error.errno)) throw error;
    warn('REMOTION_LOCAL_LOOPBACK: interface enumeration unavailable; using IPv4 localhost.');
    return {lo: [{address:'127.0.0.1',netmask:'255.0.0.0',family:'IPv4',mac:'00:00:00:00:00:00',internal:true,cidr:'127.0.0.1/8'}]};
  }
}
const original = os.networkInterfaces.bind(os);
os.networkInterfaces = () => readInterfaces(original);
module.exports = {readInterfaces};

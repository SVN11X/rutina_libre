export function parseRange(header,length) {
  const m=/^bytes=(\d*)-(\d*)$/.exec(header || '');
  if(!m || (!m[1]&&!m[2]) || length<=0)return null;
  const start=m[1]?Number(m[1]):Math.max(0,length-Number(m[2]));
  const end=m[1]?(m[2]?Math.min(Number(m[2]),length-1):length-1):length-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=length||end<start)return null;
  return {start,end};
}
export async function rangeResponse(response,header) {
  if(!header)return response;
  const bytes=await response.arrayBuffer(),part=parseRange(header,bytes.byteLength);
  if(!part)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`,'Accept-Ranges':'bytes'}});
  return new Response(bytes.slice(part.start,part.end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'video/mp4','Content-Range':`bytes ${part.start}-${part.end}/${bytes.byteLength}`,'Content-Length':String(part.end-part.start+1),'Accept-Ranges':'bytes'}});
}

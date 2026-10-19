import json,sys,zipfile
from pathlib import Path
trace=Path(sys.argv[1]); out=Path(sys.argv[2])
with zipfile.ZipFile(trace) as z:
 events=[]; network=[]
 for name in z.namelist():
  if name.endswith(".trace"):
   events.extend(json.loads(x) for x in z.read(name).decode().splitlines() if x.strip())
  if name.endswith(".network"):
   network.extend(json.loads(x).get("snapshot",{}) for x in z.read(name).decode().splitlines() if x.strip())
 errors=[r for r in events if r.get("method")=="pageError" and "Failed to update a ServiceWorker" in json.dumps(r)]
 workers=[r for r in network if "mockServiceWorker.js" in r.get("request",{}).get("url","")]
 error=errors[0] if errors else {}
 time=error.get("time",0)
 gotos=[r for r in events if r.get("type")=="before" and r.get("method")=="goto" and r.get("startTime",0)<=time]
 recent=sorted(gotos,key=lambda r:r.get("startTime",0))[-3:]
 report={"trace":str(trace),"pageErrors":errors,"nearbyNavigations":[{"time":r.get("startTime"),"url":r.get("params",{}).get("url")} for r in recent],"workerRequests":[{"url":r.get("request",{}).get("url"),"method":r.get("request",{}).get("method"),"status":r.get("response",{}).get("status"),"startedAt":r.get("startedDateTime")} for r in workers],"causeStatus":"NOT_VERIFIED: worker asset returned HTTP 200; registration update lifecycle race is a candidate, not an established root cause."}
 out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:v for k,v in report.items() if k not in ["pageErrors"]},ensure_ascii=False,indent=2))

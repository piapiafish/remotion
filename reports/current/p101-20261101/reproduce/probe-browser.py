import json, os, platform, runpy, traceback
print('SCRIPT_STARTED',flush=True)
from pathlib import Path
from playwright.sync_api import sync_playwright
print('PLAYWRIGHT_IMPORTED',flush=True)
audit=Path(__file__).parent
root=audit/'project'
out=audit/'evidence'/'browser-probe'
out.mkdir(exist_ok=True)
os.environ['TEMP']=str(audit/'tmp')
os.environ['TMP']=str(audit/'tmp')
helpers=runpy.run_path(str(root/'scripts/test-timeline-ui.py'),run_name='helpers')
report={'platform':platform.platform()}
try:
 print('DRIVER_STARTING',flush=True)
 with sync_playwright() as pw:
  print('DRIVER_READY',flush=True)
  browser=pw.chromium.launch(**helpers['WORKER']['browser_options']())
  report['browser']=browser.version
  print(json.dumps({'browser':browser.version,'status':'BROWSER_LAUNCHED'}),flush=True)
  context=browser.new_context(viewport={'width':1440,'height':960},accept_downloads=True)
  page=context.new_page()
  page.set_default_timeout(12000)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  with helpers['serve'](None,out) as url:
   report['url']=url
   print(json.dumps({'status':'SERVER_READY','url':url}),flush=True)
   page.goto(url,wait_until='networkidle',timeout=60000)
   page.get_by_role('button',name='Movie',exact=True).click()
   page.wait_for_function('!!window.__mockup?.scene',timeout=60000)
   report['title']=page.title()
   report['bodyText']=page.locator('body').inner_text()[:1200]
   report['errors']=errors
   page.screenshot(path=str(out/'editor.png'))
   report['status']='PASS' if not errors else 'FAIL'
  context.close()
  browser.close()
except Exception as e:
 report.update(status='ENVIRONMENT_BLOCKED',error=str(e),traceback=traceback.format_exc())
finally:
 (out/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(report,ensure_ascii=True),flush=True)


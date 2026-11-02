"""Render a canvas design (academy/_source/canvas) with its DC logic in headless Chrome.
   python3 academy/build/canvas_render.py Main.dc.html:HEIGHT[:WIDTH] ...   → academy/build/.shots/canvas-Main.png"""
import re, sys, json, subprocess, os, html as H
import pathlib
ACAD=pathlib.Path(__file__).resolve().parent.parent
P=str(ACAD/'_source'/(os.environ.get('CANVAS_DIR') or 'canvas'))+'/'
OUT=str(ACAD/'build'/'.shots')+'/canvas-'
os.makedirs(os.path.dirname(OUT),exist_ok=True)
BLOBS=json.load(open(ACAD/'static'/'img'/'BLOBS.json'))
def parts(f):
    s=open(P+f).read()
    x=re.search(r'<x-dc>(.*)</x-dc>',s,re.S).group(1)
    h=re.search(r'<helmet>(.*?)</helmet>',x,re.S); helm=h.group(1) if h else ''
    x=re.sub(r'<helmet>.*?</helmet>','',x,flags=re.S)
    sc=re.search(r'<script type="text/x-dc" data-dc-script(?: data-props=\'(.*?)\')?>(.*?)</script>',s,re.S)
    props=json.loads(sc.group(1)) if sc and sc.group(1) else {}
    defaults={k:v.get('default') for k,v in props.items() if isinstance(v,dict) and 'default' in v}
    return x,helm,(sc.group(2) if sc else 'class Component extends DCLogic{renderVals(){return {}}}'),defaults
RUNTIME=r'''
class DCLogic{constructor(p){this.props=p||{};this.state={};}setState(o){Object.assign(this.state,typeof o==='function'?o(this.state):o);}}
function look(scope,expr){expr=expr.trim();if(expr==='true')return true;if(expr==='false')return false;if(/^-?\d+(\.\d+)?$/.test(expr))return +expr;
 let v=scope;for(const p of expr.split('.')){if(v==null)return undefined;v=v[p];}return v;}
function subst(str,scope){const whole=str.match(/^\{\{([^}]*)\}\}$/);if(whole)return look(scope,whole[1]);
 return str.replace(/\{\{([^}]*)\}\}/g,(m,e)=>{const v=look(scope,e);return v==null?'':v;});}
function render(tplNode,scope,out){
 for(const n of Array.from(tplNode.childNodes)){
  if(n.nodeType===3){out.appendChild(document.createTextNode(subst(n.textContent,scope)));continue;}
  if(n.nodeType!==1)continue;
  const tag=n.tagName.toLowerCase();
  if(tag==='sc-for'){const list=look(scope,n.getAttribute('list').replace(/[{}]/g,''))||[];const as=n.getAttribute('as');
    list.forEach((it,i)=>{const sc=Object.create(scope);sc[as]=it;sc.index=i;render(n,sc,out);});continue;}
  if(tag==='sc-if'){const v=look(scope,n.getAttribute('value').replace(/[{}]/g,''));if(v)render(n,scope,out);continue;}
  if(tag==='dc-import'){const name=n.getAttribute('name');const p={};for(const a of n.attributes){if(!['name','hint-size'].includes(a.name))p[a.name]=subst(a.value,scope);}
    const holder=document.createElement('div');holder.style.display='contents';mount(name,p,holder);out.appendChild(holder);continue;}
  const el=document.createElement(tag==='svg'||n.namespaceURI==='http://www.w3.org/2000/svg'?tag:tag);
  const real=n.namespaceURI==='http://www.w3.org/2000/svg'?document.createElementNS('http://www.w3.org/2000/svg',n.tagName):document.createElement(tag);
  for(const a of n.attributes){if(/^on[A-Z]/.test(a.name)||/^on[a-z]+$/.test(a.name))continue;const v=subst(a.value,scope);if(v===false||v==null)continue;real.setAttribute(a.name,v===true?'':String(v));}
  render(n.content?n.content:n,scope,real);out.appendChild(real);}
}
function mount(name,props,target){const c=COMP[name];const Cls=new Function('DCLogic',c.code+';return Component;')(DCLogic);
 const inst=new Cls(Object.assign({},c.defaults,props));const vals=inst.renderVals()||{};
 const t=document.createElement('template');t.innerHTML=c.tpl;render(t.content,vals,target);}
mount(ROOT,{},document.getElementById('root'));
'''
def build(page,h,out_name=None,w=1440):
    comps={}
    def add(n):
        if n in comps: return
        x,helm,code,defaults=parts(n+'.dc.html'); comps[n]={'tpl':x,'code':code,'defaults':defaults,'helm':helm}
        for m in re.findall(r'<dc-import name="([\w-]+)"',x): add(m)
    root=page.replace('.dc.html',''); add(root)
    helms=''.join(c['helm'] for c in comps.values())
    page_html='<!doctype html><html><head><meta charset="utf-8">'+helms+'</head><body><div id="root"></div><script>const COMP='+json.dumps(comps)+';const ROOT='+json.dumps(root)+';'+RUNTIME+'</script></body></html>'
    page_html=re.sub(r'/_blob/([0-9a-f]{32})',lambda m:'file://'+str(ACAD/'static'/'img'/BLOBS.get(m.group(1),'missing.png')),page_html)
    name=out_name or root
    f=OUT+name+'.html'; open(f,'w').write(page_html)
    png=OUT+name+'.png'
    r=subprocess.run(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files','--screenshot='+png,'--window-size=%d,%d'%(w,h),'--virtual-time-budget=5000','file://'+f],capture_output=True,text=True)
    return png
if __name__=='__main__':
    for a in sys.argv[1:]:
        pp=a.split(':'); print(build(pp[0],int(pp[1]),None,int(pp[2]) if len(pp)>2 else 1440))

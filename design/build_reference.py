from pathlib import Path
from html import escape
from base64 import b64encode
from PIL import ImageFont
import json

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'references'
OUT.mkdir(exist_ok=True)
PHOTO = 'data:image/jpeg;base64,' + b64encode((ROOT/'assets/noodles-reference.jpg').read_bytes()).decode()
C = dict(bg='#FFF9F2', paper='#FFFFFF', ink='#2D2723', muted='#746A62', primary='#B84A30', accent='#E9673F', soft='#FBECE3', line='#E8DFD6', control='#927F70', green='#44664D', green_bg='#EDF2EA', amber='#98502E', amber_bg='#FFF1DE', board='#F2EDE5')
FONT = 'Microsoft YaHei, sans-serif'
seq = 0
checks=[]

def text(x,y,s,size=14,color=None,weight=400,anchor='start',maxw=None,spacing=None):
    if maxw is not None:
        f = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if weight>=600 else 'C:/Windows/Fonts/msyh.ttc',size)
        width=f.getlength(s)
        checks.append(dict(text=s,width=round(width,1),limit=maxw,ok=width<=maxw))
    return f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{color or C["ink"]}" text-anchor="{anchor}"'+(f' letter-spacing="{spacing}"' if spacing else '')+f'>{escape(s)}</text>'

def rect(x,y,w,h,fill=None,r=0,stroke=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill or C["paper"]}"'+(f' stroke="{stroke}" stroke-width="1"' if stroke else '')+'/>'

def line(x1,y1,x2,y2,color=None,width=1):
    return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{color or C["line"]}" stroke-width="{width}"/>'

def circle(x,y,r,fill,stroke=None):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'

def icon(name,x,y,size=20,color=None):
    paths={
      'bowl':'M3 10h18c-1 6-4.5 9-9 9s-8-3-9-9Zm4 10h10M8 3c-2 2 2 3 0 5M14 2c-2 2 2 3 0 5',
      'pin':'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
      'arrow':'M4 12h15M14 6l6 6-6 6',
      'chevron':'M9 5l7 7-7 7',
      'back':'M15 5l-7 7 7 7',
      'check':'M5 12l5 5 10-11',
      'refresh':'M20 7v6h-6M19 11a7 7 0 1 0-1 7',
      'clock':'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',
      'close':'M6 6l12 12M18 6 6 18',
      'minus':'M5 12h14',
      'info':'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6M12 7v.1',
      'route':'M6 21V7a4 4 0 0 1 8 0v10a3 3 0 0 0 6 0V4M17 7l3-3 3 3'
      ,'undo':'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14'
      ,'filter':'M4 7h16M4 17h16M8 4v6M16 14v6'
      ,'chat':'M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9ZM8 8h8M8 12h5'
    }
    return f'<g transform="translate({x} {y}) scale({size/24})" fill="none" stroke="{color or C["ink"]}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="{paths[name]}"/></g>'

def photo(x,y,w,h,r=20,position='xMidYMid'):
    global seq
    seq+=1
    return f'<defs><clipPath id="photo{seq}">{rect(x,y,w,h,r=r)}</clipPath></defs><image x="{x}" y="{y}" width="{w}" height="{h}" href="{PHOTO}" preserveAspectRatio="{position} slice" clip-path="url(#photo{seq})"/>'

def pill(x,y,w,label,selected=False,height=36,size=14):
    s=rect(x,y,w,height,C['soft'] if selected else C['paper'],height/2,C['primary'] if selected else C['control'])
    if selected:s+=icon('check',x+12,y+height/2-8,16,C['primary'])
    return s+text(x+w/2+(9 if selected else 0),y+height/2+size*.36,label,size,C['primary'] if selected else C['ink'],500,'middle',w-(42 if selected else 16))

def button(x,y,w,label,kind='primary',h=56,with_arrow=False):
    fill=C['primary'] if kind=='primary' else C['paper']
    fg=C['paper'] if kind=='primary' else C['ink']
    s=rect(x,y,w,h,fill,16,None if kind=='primary' else C['control'])+text(x+w/2,y+h/2+6,label,18,fg,600,'middle',w-56)
    if with_arrow:s+=icon('arrow',x+w-44,y+h/2-11,22,fg)
    return s


exec(compile((ROOT / 'swipe_layout.py').read_text(encoding='utf-8'), 'swipe_layout.py', 'exec'))

def clipped(content,x,y,w,h,r):
    global seq
    seq+=1
    return f'<defs><clipPath id="clip{seq}">{rect(x,y,w,h,r=r)}</clipPath></defs><g clip-path="url(#clip{seq})">{content}</g>'

def round_control(name,x,y,r=24,fill=None,color=None,stroke=None):
    return circle(x,y,r,fill or C['paper'],stroke)+icon(name,x-12,y-12,24,color)

def badge(x,y):
    return rect(x,y,64,26,C['ink'],13)+text(x+32,y+18,'示意图',12,C['paper'],anchor='middle')

def entry():
    s=rect(0,0,390,844,C['bg'])
    s+=rect(24,24,32,32,C['primary'],10)+icon('bowl',29,29,22,C['paper'])+text(66,48,'吃什么',22,weight=700)+text(366,46,'午餐',14,C['muted'],anchor='end')
    s+=text(24,118,'这一顿，凭眼缘。',36,weight=700,maxw=342)
    s+=photo(16,148,358,426,28)+badge(30,162)
    s+=icon('pin',26,615,22,C['primary'])+text(62,632,'示例大学 · 东区宿舍',16,weight=500,maxw=258)+icon('chevron',339,616,18)
    s+=line(24,659,366,659)+button(24,694,342,'帮我选这一顿',with_arrow=True)
    s+=text(195,797,'先随便看看',14,C['primary'],anchor='middle')
    return s

def rec_top():
    s=rect(0,0,390,844,C['bg'])+icon('bowl',21,29,25,C['primary'])
    s+=icon('pin',124,30,18)+text(148,45,'东区宿舍',15,weight=500)+round_control('filter',350,39,22)
    s+=text(20,80,'¥20 内 · 步行 10 分钟内',12,C['muted'])+text(370,80,'体验示例',12,C['muted'],anchor='end')
    return s

def card():
    s=rect(16,96,358,588,C['paper'],28)
    s+=clipped(photo(16,96,358,492,0)+rect(16,588,358,96,C['paper']),16,96,358,588,28)
    s+=badge(30,110)+round_control('info',338,132,22)
    s+=text(32,626,'鲜虾鸡蛋汤面',24,weight=700,maxw=240)+text(358,610,'参考价',12,C['muted'],anchor='end')+text(358,639,'¥18',26,weight=700,anchor='end')
    s+=icon('pin',32,650,16,C['muted'])+text(53,664,'二食堂 1F · 汤面档',13,C['muted'],maxw=192)
    s+=icon('clock',281,650,16,C['muted'])+text(360,664,'约5分钟',13,C['muted'],anchor='end')
    return s

def controls():
    s=round_control('undo',58,746,24,stroke=C['control'])
    s+=circle(172,746,34,C['paper'],C['control'])+icon('close',156,730,32)
    s+=circle(291,746,38,C['primary'])+icon('check',273,728,36,C['paper'])
    s+=text(195,817,'左滑换一个 · 右滑就吃这个',13,C['muted'],anchor='middle')
    return s

def recommendation(direction=0):
    s=rec_top()
    if direction:
        s+=rect(24,108,342,568,C['soft'],28)+icon('bowl',171,335,48,C['primary'])
        s+=text(195,416,'松手即可',16,C['muted'],anchor='middle')
        body=card()
        label='换一个' if direction<0 else '就吃这个'
        fg=C['ink'] if direction<0 else C['primary']
        s+=f'<g transform="translate({direction*96} 0) rotate({direction*7} 195 684)">{body}</g>'
        s+=rect(77,307,236,88,C['paper'],20,fg)+icon('close' if direction<0 else 'check',93,334,32,fg)+text(213,362,label,26,fg,700,'middle',164)
    else:s+=card()
    return s+controls()

def result():
    s=rect(0,0,390,844,C['bg'])
    s+=circle(36,42,16,C['green_bg'])+icon('check',25,31,22,C['green'])+text(63,49,'已选定',18,C['green'],600)+round_control('undo',344,42,24)
    s+=photo(24,94,342,278,24)+badge(38,108)
    s+=text(24,421,'鲜虾鸡蛋汤面',28,weight=700,maxw=280)+text(366,454,'参考价 ¥18',14,C['muted'],anchor='end')
    s+=rect(24,484,342,144,C['paper'],22)+icon('pin',42,505,22,C['primary'])+text(74,525,'二食堂 · 汤面档',21,weight=600,maxw=266)
    s+=text(42,558,'1F 东侧，进门右转',15,C['muted'])+text(42,592,'约 5 分钟',15)+text(346,610,'今日 11:20 核验',12,C['muted'],anchor='end')
    s+=button(24,660,342,'去这里',with_arrow=True)
    s+=icon('chat',27,757,22,C['muted'])+text(62,774,'这次选饭怎么样？',14,C['muted'])+icon('chevron',340,758,18,C['muted'])
    return s

def detail():
    s=recommendation()+rect(0,0,390,844,'#2D272388')
    s+=rect(0,290,390,554,C['bg'],28)+rect(174,302,42,4,C['control'],2)
    s+=text(24,351,'这份提议',23,weight=700)+round_control('close',346,340,22)
    s+=text(24,401,'为什么是它',13,C['primary'],600)+text(24,434,'在预算内，从宿舍走过去也近。',16,maxw=342)
    s+=line(24,462,366,462)+text(24,493,'二食堂 1F · 汤面档',18,weight=600)+text(24,525,'参考价 ¥18 · 从东区宿舍步行约 5 分钟',14,maxw=342)
    s+=text(24,555,'信息核验：今日 11:20',13,C['muted'])+text(24,581,'图片为菜品示意，不代表档口实际出品。',13,C['muted'],maxw=342)
    s+=rect(24,610,342,70,C['amber_bg'],14)+icon('info',38,633,20,C['amber'])+text(68,637,'配料信息',13,C['amber'])+text(68,662,'含虾、蛋、小麦',15,C['amber'],600)
    s+=rect(24,712,342,48,C['paper'],16,C['control'])+text(195,743,'这一顿不想吃面',16,anchor='middle')
    s+=text(195,809,'信息有误',13,C['muted'],anchor='middle')
    return s

def svg(content,w,h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{content}</svg>'

def frame(content,x,y,scale=1):
    inner=clipped(content,0,0,390,844,28)
    return rect(x-6,y-6,390*scale+12,844*scale+12,'#DDD2C6',32)+f'<g transform="translate({x} {y}) scale({scale})">{inner}</g>'

screens=[('01-entry',entry()),('02-recommendation',recommendation()),('03-decided',result())]

def overview():
    s=rect(0,0,1480,1200,C['board'])+text(64,63,'吃什么 / 设计语言 V1.1',16,C['primary'],600)
    s+=text(64,127,'看见食欲，滑向这一顿。',44,weight=700)+text(1416,65,'IMAGE FIRST / SWIPE TO DECIDE',13,C['muted'],anchor='end')
    s+=text(1416,115,'更少阅读   /   更大图片   /   更轻动作',15,C['muted'],anchor='end')
    for (_,content),x in zip(screens,[64,544,1024]):s+=frame(content,x,200)
    caps=[('01  凭眼缘开始','一句邀请，直接进入。'),('02  一滑做决定','左滑换一个；右滑选定这一顿。'),('03  选好就去吃','收起推荐，把注意力交给路线。')]
    for x,(title,sub) in zip([64,544,1024],caps):s+=text(x,1091,title,20,weight=600)+text(x,1125,sub,15,C['muted'],maxw=390)
    s+=line(64,1151,1416,1151)+text(64,1180,'设计演示：校园、菜品、价格、核验时间与位置均为样例。图片为示意；路线在真实产品中连接已核实地点。',13,C['muted'])
    return s

def board():
    s=rect(0,0,1480,1160,C['board'])+text(64,64,'吃什么 / 视觉与动作规范',16,C['primary'],600)+text(64,123,'把文字让给食物，把判断交给手指。',40,weight=700)
    for x,y,w,h in [(64,184,644,370),(732,184,684,370),(64,578,644,442),(732,578,684,442)]:s+=rect(x,y,w,h,C['bg'],24)
    s+=text(88,224,'01 / 暖色退后，食物在前',20,weight=600)
    for i,(name,col) in enumerate([('暖白',C['bg']),('番茄',C['primary']),('深棕',C['ink']),('灰褐',C['muted']),('浅番茄',C['soft'])]):
        x=88+i*120
        s+=rect(x,253,104,100,col,16,C['line'])+text(x,383,name,15,weight=500)+text(x,409,col,13,C['muted'])
    s+=text(88,460,'照片使用自然食物色，界面只留一个强调色。',14,C['muted'])+text(88,496,'白色图标 / 番茄底：对比度 5.17:1',14,C['primary'])
    s+=text(756,224,'02 / 图标承担动作',20,weight=600)
    for x,name,label in [(801,'undo','撤回'),(914,'close','换一个'),(1027,'check','就吃这个'),(1140,'info','详情'),(1253,'filter','条件')]:
        s+=round_control(name,x,295,30,C['primary'] if name=='check' else C['paper'],C['paper'] if name=='check' else C['ink'],None if name=='check' else C['control'])+text(x,352,label,14,anchor='middle')
    s+=text(756,407,'图标 24 px / 热区 ≥44 px / 主动作 76 px',14,C['muted'])
    s+=text(756,448,'首次保留一句方向提示；每个图标都有可访问名称。',14,C['muted'])+text(756,489,'不用爱心代表选饭，不用红色叉号表示普通跳过。',14,C['muted'])
    s+=text(88,620,'03 / 大图与微量事实',20,weight=600)+photo(88,647,220,304,20)
    s+=text(336,679,'492 px',36,C['primary'],700)+text(336,709,'推荐首屏的图片高度',14,C['muted'])
    s+=text(336,759,'约 58% 视口高度',20,weight=600)+text(336,791,'图片占卡片高度约 84%',14,C['muted'])
    s+=text(336,838,'菜名 24 / 32',18,weight=600)+text(336,874,'参考价与位置 13–14',14,C['muted'])+text(336,910,'理由、核验时间 → 详情',14,C['muted'])
    s+=text(88,992,'必要事实保留；未知状态与禁忌相关风险不能折叠。',14,C['muted'])
    s+=text(756,620,'04 / 轻反馈，可撤回',20,weight=600)
    s+=rect(756,647,636,74,C['paper'],16,C['control'])+icon('close',777,671,25)+text(822,692,'左滑：换一个，只跳过这张',18)
    s+=rect(756,739,636,74,C['soft'],16)+icon('check',777,763,25,C['primary'])+text(822,784,'右滑：就吃这个，进入结果页',18,C['primary'])
    s+=rect(756,831,636,74,C['amber_bg'],16)+icon('info',777,855,25,C['amber'])+text(822,876,'营业待确认',18,C['amber'])
    s+=text(756,943,'随手跟随 → 达阈值显意图 → 松手才提交',16,weight=500)+text(756,978,'取消会回位；撤回不改条件、不重置会话计时。',14,C['muted'])
    s+=line(64,1047,1416,1047)+text(64,1084,'单卡 / 16 px 卡片边距 / 28 px 圆角 / 图标控制 / 首次轻提示 / 不自动连刷',17,weight=500)
    s+=text(64,1123,'图片尺寸以 390 × 844 内容视口为基准；矮屏、长菜名、风险提示与大字体优先保证事实和操作可达。',13,C['muted'])
    return s

def gesture_board():
    s=rect(0,0,1480,1200,C['board'])+text(64,63,'吃什么 / 手势与详情',16,C['primary'],600)+text(64,125,'滑动只做判断，细节按需展开。',40,weight=700)
    views=[(recommendation(-1),'01  左滑 · 换一个','只跳过当前菜品；可撤回。'),(recommendation(1),'02  右滑 · 就吃这个','松手确认，随后结束推荐。'),(detail(),'03  点 ⓘ · 看详情','理由、核验、排除与报错按需展开。')]
    for x,(body,title,caption) in zip([64,544,1024],views):
        s+=frame(body,x,200)+text(x,1091,title,20,weight=600)+text(x,1125,caption,15,C['muted'],maxw=390)
    s+=line(64,1151,1416,1151)+text(64,1180,'左、右两图为拖动中的状态；浮签明确本次动作。手势与底部按钮等价，方向本身不写入长期口味偏好。',13,C['muted'])
    return s

for name,content in screens:(OUT/(name+'.svg')).write_text(svg(content,390,844),encoding='utf-8')
for name,content,w,h in [('00-design-overview',overview(),1480,1200),('04-style-board',board(),1480,1160),('05-swipe-and-detail',gesture_board(),1480,1200),('06-detail',detail(),390,844)]:
    (OUT/(name+'.svg')).write_text(svg(content,w,h),encoding='utf-8')
(ROOT/'layout-check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
failed=[c for c in checks if not c['ok']]
print(json.dumps({'screens':4,'measured_texts':len(checks),'overflow':failed},ensure_ascii=False))
if failed:raise SystemExit(1)

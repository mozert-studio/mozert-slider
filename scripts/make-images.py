# Generates the demo artwork (layered-ridge landscapes) as small SVG files.
import math, random, os
out = os.path.join(os.path.dirname(__file__), '..', 'docs', 'img')
os.makedirs(out, exist_ok=True)
W, H = 1200, 800
palettes = [
 ('Dawn ridge',   ['#ffd6a5','#ff9a76','#e8576b','#8a3a7a','#3b2a63','#1a1740'], '#fff1d6'),
 ('Glacier',      ['#dff3ff','#9fd4f0','#5aa7d6','#2f6fa8','#1c3f73','#0d1f45'], '#ffffff'),
 ('Pine dusk',    ['#fde7c8','#f4b16b','#d9714a','#7b4a5e','#2f3b5c','#14213d'], '#ffe9b0'),
 ('Mint valley',  ['#f1fbe3','#c6ebb0','#8ed1a3','#4da6a0','#2a6b84','#173b5c'], '#fffbe0'),
 ('Ember',        ['#ffe1d0','#ffa57a','#ff6a3d','#b8332f','#5c1f3a','#25102e'], '#fff0c9'),
 ('Lagoon',       ['#e4fbff','#a3eef2','#4fd1d0','#1ea0b8','#17617f','#0b2f4f'], '#fffde8'),
 ('Violet haze',  ['#f5e8ff','#d5b6ff','#a982f5','#6c4fd6','#3a2a94','#1b1654'], '#fff4fb'),
 ('Sand',         ['#fff4dc','#f3d9a1','#dfb067','#b97d4c','#7a4a3c','#3c2433'], '#fffaf0'),
 ('Moss',         ['#eef6d8','#cfe29c','#9cc46a','#5d9a5a','#2f6a4f','#143b34'], '#fdffe6'),
 ('Rose quartz',  ['#fff0f3','#ffc6d3','#f58aa9','#d04d84','#7d2a6b','#331541'], '#fff8f0'),
 ('Slate sea',    ['#eef3f7','#b9c9d6','#7f9bb2','#4b6a8a','#2b415f','#12202f'], '#f6fbff'),
 ('Citrus',       ['#fffbd1','#ffe27a','#ffb740','#f0803c','#b04a3a','#4a2230'], '#fffdea'),
]
def ridge(rnd, base, amp, rough, color, id_):
    pts=[]; n=40; ph=[rnd.uniform(0,6.28) for _ in range(4)]
    for i in range(n+1):
        x=W*i/n
        y=base
        for k,p in enumerate(ph):
            y+=math.sin(x/ W*(2+k*2.3)*math.pi+p)*amp/(1+k*rough)
        pts.append((x,y))
    d='M0,%d '%H+' '.join('L%.1f,%.1f'%p for p in [(0,pts[0][1])]+pts)+' L%d,%d Z'%(W,H)
    return '<path d="%s" fill="%s"/>'%(d,color)
for idx,(name,cols,sun) in enumerate(palettes):
    rnd=random.Random(idx*77+5)
    sx=rnd.randint(250,950); sy=rnd.randint(190,320); sr=rnd.randint(70,120)
    s=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" role="img" aria-label="%s">'%(W,H,W,H,name)]
    s.append('<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
             '<radialGradient id="s"><stop offset="0" stop-color="%s" stop-opacity="1"/><stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient></defs>'%(cols[0],cols[1],sun,sun))
    s.append('<rect width="%d" height="%d" fill="url(#g)"/>'%(W,H))
    s.append('<circle cx="%d" cy="%d" r="%d" fill="url(#s)" opacity=".55"/><circle cx="%d" cy="%d" r="%d" fill="%s"/>'%(sx,sy,sr*3,sx,sy,sr,sun))
    for i in range(1,6):
        base=300+i*85+rnd.randint(-20,20)
        s.append(ridge(rnd, base, 70-i*6, 1.8, cols[i], i))
    s.append('</svg>')
    open(os.path.join(out,'scene-%02d.svg'%(idx+1)),'w').write(''.join(s))
print('ok', len(palettes))

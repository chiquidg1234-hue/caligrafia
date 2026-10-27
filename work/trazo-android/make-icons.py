from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'outputs'/'trazo-android'/'web'
for size in (192,512):
 im=Image.new('RGB',(size,size),'#193c66');d=ImageDraw.Draw(im)
 font=ImageFont.truetype('C:/Windows/Fonts/georgiai.ttf',int(size*.73))
 d.line((size*.22,size*.76,size*.78,size*.76),fill='#7f9dbb',width=max(1,int(size*.009)))
 d.text((size*.3,size*.06),'t.',font=font,fill='white',stroke_width=0)
 im.save(root/f'icon-{size}.png')

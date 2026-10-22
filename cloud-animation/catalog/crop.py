# Cut the individual panels out of the reference sheets (coordinates measured on each sheet).
from PIL import Image
U='/root/.claude/uploads/b2c9e50c-cd7e-5ab0-9210-4ba358909790/'
A=Image.open(U+'76268eb5-image.png').convert('RGB')   # Cloud Reactions (12)
B=Image.open(U+'3701ac4e-image.png').convert('RGB')   # light beams / actions / weather / indicators
C=Image.open(U+'2625c8e2-image.png').convert('RGB')   # rain / snow / night
D=Image.open(U+'9e220ee0-image.png').convert('RGB')   # character sheet
S=Image.open(U+'311a53fd-image.png').convert('RGB')   # storyboard
H=Image.open(U+'bf8076f5-image.png').convert('RGB')   # hero on black
def save(im, box, name): im.crop(box).save(f'img/{name}.jpg', quality=93)
# A: 4x3 grid
xs=[(20,364),(375,719),(730,1074),(1085,1429)]; ys=[(123,362),(432,671),(737,978)]
for r,(y0,y1) in enumerate(ys):
    for c,(x0,x1) in enumerate(xs): save(A,(x0+2,y0+2,x1-2,y1-2),f'react{r*4+c+1:02d}')
# C: 4x3 grid
xs=[(184,487),(503,804),(817,1117),(1133,1421)]; ys=[(108,365),(447,689),(763,996)]
for r,(y0,y1) in enumerate(ys):
    for c,(x0,x1) in enumerate(xs): save(C,(x0+2,y0+2,x1-2,y1-2),f'weather{r*4+c+1:02d}')
# B: light-beam emotions (11), actions (11), precipitation/night/env (9), indicators (10)
ex=[12,160,310,455,600,745,885,1035,1160,1255,1390,1530]
for i in range(11): save(B,(ex[i]+2,40,ex[i+1]-2,212),f'beam{i+1:02d}')
ax=[6,147,284,422,567,714,853,990,1128,1263,1395,1530]
for i in range(11): save(B,(ax[i]+2,299,ax[i+1]-2,482),f'action{i+1:02d}')
for i,(x0,x1) in enumerate([(11,189),(192,350),(353,519),(542,704),(707,869),(872,1031),(1048,1204),(1207,1364),(1367,1525)]):
    save(B,(x0,572,x1,751),f'env{i+1:02d}')
ix=[8,155,305,455,612,762,915,1068,1208,1365,1530]
for i in range(10): save(B,(ix[i]+3,834,ix[i+1]-3,968),f'sign{i+1:02d}')
# D: hero, turnaround, details, lighting, moods, environments, sequence
save(D,(0,0,415,313),'sheet_hero')
for i,(x0,x1) in enumerate([(425,570),(575,725),(730,865),(865,1020),(1025,1182)]): save(D,(x0,50,x1,195),f'turn{i+1}')
for i,(x0,x1) in enumerate([(17,177),(183,344),(351,512),(519,682)]): save(D,(x0,349,x1,465),f'detail{i+1}')
for i,(x0,x1) in enumerate([(1101,1238),(1241,1381),(1385,1528)]): save(D,(x0,311,x1,491),f'light{i+1}')
for i,(x0,x1) in enumerate([(16,160),(165,310),(315,455),(460,600),(605,745),(750,900)]): save(D,(x0,568,x1,680),f'mood{i+1}')
for i,(x0,x1) in enumerate([(942,1136),(1139,1333),(1336,1530)]): save(D,(x0,570,x1,720),f'envD{i+1}')
sx=[10,160,312,463,615,767,920,1072,1224,1376,1527]
for i in range(10): save(D,(sx[i]+2,781,sx[i+1]-2,955),f'seq{i+1:02d}')
# storyboard 5x2
for r in range(2):
    for c in range(5): save(S,(c*355+3,r*444+3,c*355+352,r*444+441),f'board{r*5+c+1:02d}')
H.save('img/hero_black.jpg', quality=94)

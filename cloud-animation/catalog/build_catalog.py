"""Builds catalog.html (A4 landscape, one <section> per page) from the panels cut by crop.py and the renders in img/anim
and img/model. print_pdf.mjs then prints it to Journal_Cloud_Catalog.pdf with headless Chromium."""
import html

PLAYER = 'https://claude.ai/artifact/W6Gg6RLsoEpavnzvQ5oqBv'
e = html.escape


def fig(src, title, sub='', cls=''):
    return (f'<figure class="{cls}"><div class="ph"><img src="{src}" alt="{e(title)}"></div>'
            f'<figcaption><b>{e(title)}</b>{f"<span>{e(sub)}</span>" if sub else ""}</figcaption></figure>')


def page(n, kicker, title, body, cls=''):
    return (f'<section class="page {cls}"><header class="run"><span>The Journal Cloud</span><span>{e(kicker)}</span></header>'
            f'<h2>{title}</h2>{body}<footer class="folio">{n:02d}</footer></section>')


pages = []

# 1 cover
pages.append('''<section class="page cover">
  <div class="cover-img"><img src="img/hero_black.jpg" alt="The Journal Cloud"></div>
  <div class="cover-text">
    <p class="eyebrow">Character catalog · Volume 01</p>
    <h1>The Journal<br>Cloud</h1>
    <p class="tag">A small cloud for a brighter day.<br>Simple form, endless emotions.</p>
    <p class="meta">Felt character · Light-beam reactions · Weather moods · Motion</p>
  </div>
</section>''')

# 2 meet the character
swatches = [('#F5EDE1', 'Main cloud', 'Warm white (cream)'), ('#E6D8C7', 'Shadow', 'Soft beige'),
            ('#FFD9A6', 'Warm light', 'Sunset glow, highlight'), ('#1A1A1A', 'Eye', 'Deep black, glossy')]
sw = ''.join(f'<div class="sw"><i style="background:{c}"></i><b>{e(n)}</b><span>{c} · {e(d)}</span></div>' for c, n, d in swatches)
pages.append(page(2, 'Meet the character', 'Meet <em>Journal</em>', f'''
<div class="two">
  <div class="hero-card"><img src="img/hero_black.jpg" alt="Journal, front view"></div>
  <div class="stack">
    <p class="lede">Journal is a small needle-felted cloud with two glossy black eyes and no mouth. It never speaks:
    it shows how it feels through shape, tilt, light and a few glowing marks drawn in the air.</p>
    <dl class="facts">
      <dt>Form</dt><dd>One big central puff with a domed top, side puffs left and right, a small upper-right puff, a softly bumped underside</dd>
      <dt>Material</dt><dd>Felted wool: soft, slightly fuzzy fibres with natural variation</dd>
      <dt>Eyes</dt><dd>Two smooth, slightly glossy black ovals; no mouth</dd>
      <dt>Light</dt><dd>Backlit glow around the whole silhouette, warm in the creases</dd>
      <dt>Proportions</dt><dd>Height about 0.7 × width · each eye about 12% of width · eyes about 20% of width apart</dd>
    </dl>
    <p class="label">Colour palette</p>
    <div class="swatches">{sw}</div>
  </div>
</div>'''))

# 3 form and materials
turn = ''.join(fig(f'img/turn{i}.jpg', t) for i, t in enumerate(['Front', '3/4 view', 'Side view (left)', 'Back', '3/4 view (right)'], 1))
det = ''.join(fig(f'img/detail{i}.jpg', t, s) for i, (t, s) in enumerate([
    ('Felt / wool texture', 'Soft, slightly fuzzy fibres'), ('Eye detail', 'Smooth, slightly glossy black oval'),
    ('Edge lighting', 'Soft glow from sunlight, subtle translucency'), ('Bottom view', 'Slightly flatter underside')], 1))
lit = ''.join(fig(f'img/light{i}.jpg', t) for i, t in enumerate(['Daylight', 'Golden hour', 'Night'], 1))
pages.append(page(3, 'Form & materials', 'Turnaround and details', f'''
<p class="label">Turnaround</p><div class="row five">{turn}</div>
<div class="split">
  <div><p class="label">Close-ups</p><div class="row four">{det}</div></div>
  <div><p class="label">Lighting reference</p><div class="row three">{lit}</div></div>
</div>'''))

# 4 cloud reactions
react = [('Neutral', 'Quiet and present'), ('Happy', 'Bright and joyful'), ('Excited', 'Full of energy'),
         ('Curious', 'Wondering about the world'), ('Surprised', 'Wide awake'), ('Sleepy', 'Resting peacefully'),
         ('Calm', 'Balanced and at ease'), ('Thinking', 'Exploring ideas'), ('Dizzy', 'Spinning thoughts'),
         ('Shy', 'A little timid'), ('Fast / Zoom', 'Off to new places'), ('Magical / Inspired', 'Big dreams ahead')]
cells = ''.join(fig(f'img/react{i:02d}.jpg', f'{i}. {t}', s) for i, (t, s) in enumerate(react, 1))
pages.append(page(4, 'Expressions', 'Cloud reactions', f'<div class="grid g4">{cells}</div>', 'dense'))

# 5 expression range
moods = ''.join(fig(f'img/mood{i}.jpg', t, s) for i, (t, s) in enumerate([
    ('Neutral', ''), ('Happy', 'Slightly rounder'), ('Curious', 'Tilted'), ('Excited', 'Slightly stretched up'),
    ('Calm', 'Soft'), ('Sleepy', 'Eyes slightly lower')], 1))
beams = [(1, 'Neutral'), (2, 'Happy'), (3, 'Excited'), (4, 'Surprised'), (5, 'Curious'), (6, 'Calm'), (7, 'Sleepy'),
         (8, 'Shy'), (10, 'Confused'), (11, 'Sad')]
beam = ''.join(fig(f'img/beam{i:02d}.jpg', t) for i, t in beams)
pages.append(page(5, 'Expressions', 'Mood through shape, tilt and light', f'''
<p class="note">Journal has no mouth. Moods come from the body first: rounder for happy, a tilt for curious, a little
stretch for excited, eyes lower for sleepy. Light-beam marks are added on top when a feeling needs to read from far away.</p>
<p class="label">Mood variations (shape, tilt, lighting)</p><div class="row six">{moods}</div>
<p class="label">Emotions with light-beam reactions</p><div class="row ten">{beam}</div>'''))

# 6 indicators and symbols
signs = ['Point / Highlight', 'Arrow', 'Circle / Focus', 'Sparkle / Star', 'Exclamation', 'Question', 'Love', 'Idea',
         'Attention', 'Loading / Thinking']
sg = ''.join(fig(f'img/sign{i:02d}.jpg', t) for i, t in enumerate(signs, 1))
pages.append(page(6, 'Light-beam elements', 'Indicators and symbols', f'''
<div class="grid g5">{sg}</div>
<div class="rules">
  <div><b>Drawn in light</b><span>Every mark is a thin warm-gold stroke (#FFD9A6) with a soft glow, never a solid shape.</span></div>
  <div><b>Close to the body</b><span>Marks sit around the head or orbit the cloud; they never cover the eyes.</span></div>
  <div><b>One idea at a time</b><span>Use a single symbol per moment so the feeling reads at a glance.</span></div>
  <div><b>No words</b><span>Symbols replace text: a question mark, never the word “why”.</span></div>
</div>'''))

# 7 motion
acts = [('1', 'Sit still'), ('2', 'Lift up'), ('3', 'Rising'), ('4', 'Higher'), ('5', 'Turn left'), ('6', 'Side view'),
        ('6', 'Back view'), ('7', 'Rotating'), ('8', 'Side view'), ('9', 'Turning to front'), ('10', 'Settle')]
ac = ''.join(fig(f'img/action{i:02d}.jpg', f'{n}. {t}') for i, (n, t) in enumerate(acts, 1))
seq = ['Start (sitting still)', 'Idle (subtle breathing)', 'Begin to float', 'Rising', 'Higher', 'Turning left',
       '3/4 side', 'Side / back', 'Back view (almost)', 'Back view (final)']
sq = ''.join(fig(f'img/seq{i:02d}.jpg', f'{i}. {t}') for i, t in enumerate(seq, 1))
board = ['Front', 'Eyes slide right', 'Turning', 'Eye at the edge', 'Back', 'Back', 'Back, other side', 'Eyes return', 'Float up', 'Glint']
bd = ''.join(fig(f'img/board{i:02d}.jpg', f'{i}. {t}') for i, t in enumerate(board, 1))
pages.append(page(7, 'Motion', 'Actions and movement', f'''
<p class="label">Actions with light trails</p><div class="row eleven">{ac}</div>
<p class="label">Animation sequence: sit still, float up, turn around</p><div class="row ten">{sq}</div>
<p class="label">Storyboard for the 10-second animation</p><div class="row ten">{bd}</div>
<p class="note">Motion is slow and buoyant: Journal eases into every move, floats rather than jumps, and settles with a
small overshoot. Light trails show direction (an arrow for lift, a ring for rotation) and fade as the move ends.</p>'''))

# 8 weather and night
rows = [('Rain', 'Cozy, fresh and full of life', ['#8E90A8', '#AEB0C2', '#D3D4DE', '#8FA6C8'],
         [('Drizzly / Cozy rain', 'A gentle, comforting rain'), ('Stormy', 'Windy and intense'),
          ('Shaking off rain', 'A fresh shake'), ('Refreshing after rain', 'Clean, bright, renewed')]),
        ('Snow', 'Crisp, magical and peaceful', ['#EEF1FA', '#D2D6EA', '#B1C3EE', '#9CB3DF'],
         [('Chilly', 'A crisp, cold day'), ('Shivering', 'A little cold'), ('Snowy joy', 'Full of playful energy'),
          ('Peaceful snow', 'Quiet and serene')]),
        ('Night', 'Dreamy, calm and full of wonder', ['#3E3F66', '#7A6B9B', '#8E68C2', '#BC9EE0'],
         [('Sleepy', 'Resting peacefully'), ('Dreaming', 'Lost in a sweet dream'), ('Curious at night', 'Wondering what’s next'),
          ('Magical night', 'Big dreams ahead')])]
wx = ''
k = 1
for name, mood, pal, items in rows:
    dots = ''.join(f'<i style="background:{c}"></i>' for c in pal)
    figs = ''
    for t, s in items:
        figs += fig(f'img/weather{k:02d}.jpg', t, s); k += 1
    wx += f'<div class="wx"><div class="wx-head"><h3>{name}</h3><p>{mood}</p><div class="dots">{dots}</div></div><div class="row four">{figs}</div></div>'
pages.append(page(8, 'Weather moods', 'Rain, snow and night', wx, 'dense'))

# 9 environments
env = [('env07', 'Daytime'), ('env08', 'Golden hour'), ('env09', 'Nighttime'), ('envD1', 'Travel / daytime'),
       ('env01', 'Snow'), ('env02', 'Rain'), ('env03', 'Mixed / drizzle'), ('envD2', 'Rainy'),
       ('env04', 'Night (idle)'), ('env05', 'Sleepy night'), ('env06', 'Starry'), ('envD3', 'Snowy')]
ev = ''.join(fig(f'img/{f}.jpg', t) for f, t in env)
pages.append(page(9, 'Environments', 'One companion, every kind of sky', f'''
<div class="grid g4 env">{ev}</div>
<p class="note">The felt body keeps its cream colour everywhere; the world tints it. Daylight is neutral, golden hour
adds peach in the creases, night turns the glow lavender, and rain greys the wool down.</p>''', 'dense'))

# 10 the 3D model
model = ''.join(fig(f'img/model/{f}.jpg', t) for f, t in [('t0_75', 'Front'), ('t2_75', '3/4 turning right'),
                                                              ('t3_05', 'Side'), ('t3_50', 'Back'), ('t4_00', 'Other side')])
pages.append(page(10, '3D model', 'Journal as a real-time 3D model', f'''
<div class="two wide">
  <div class="hero-card dark"><img src="img/model/t0_75.jpg" alt="3D model, front view"></div>
  <div class="stack">
    <p class="lede">For animation, Journal is built as a raymarched 3D shape that runs live in a web browser, on a phone,
    tablet or computer.</p>
    <dl class="facts">
      <dt>Shape</dt><dd>One central mass and 12 felt puffs, blended smoothly, laid out from the hero image</dd>
      <dt>Surface</dt><dd>Curly felt fibres at three scales, peach creases, a backlit fuzzy rim and glow</dd>
      <dt>Eyes</dt><dd>Glossy beads set into the felt, with a soft highlight upper left; they blink and squeeze</dd>
      <dt>Motion</dt><dd>Spring physics for every move: overshoot, follow-through, and puffs that settle on their own</dd>
    </dl>
  </div>
</div>
<p class="label">Model turnaround</p><div class="row five dark">{model}</div>'''))

# 11 the 10-second animation
beats = [('t0_80', '0.8 s', 'Hover', 'Idle breathing, a blink'), ('t2_75', '2.8 s', 'Turn away', 'Eyes slide off to the right'),
         ('t3_50', '3.5 s', 'Back view', 'No face, puffs roll past'),
         ('t4_05', '4.1 s', 'Eyes return', 'From the left side'), ('t6_65', '6.7 s', 'Crouch', 'Squash before the rise'),
         ('t7_10', '7.1 s', 'Rise', 'Stretch, the shadow shrinks'), ('t8_30', '8.3 s', 'Glint', 'Happy squint, light ticks'),
         ('t9_20', '9.2 s', 'Settle', 'Proud float, then fade')]
bt = ''.join(fig(f'img/anim/{f}.jpg', f'{tc} · {t}', s) for f, tc, t, s in beats)
pages.append(page(11, 'In motion', 'The 10-second animation', f'''
<div class="grid g4 anim">{bt}</div>
<p class="note">Built from the storyboard: a full turn, a crouch and rise, then a glint. Watch it live at
<a href="{PLAYER}">{PLAYER.replace("https://", "")}</a> (private link; sign in to claude.ai). The rendered files are
<b>puff_cloud_10s.mp4</b> (1080p, 30 fps) and <b>puff_cloud_10s.gif</b>.</p>'''))

# 12 back cover / usage
pages.append(page(12, 'Usage', 'Keeping Journal on model', '''
<div class="two usage">
  <div class="dos">
    <h3>Do</h3>
    <ul>
      <li>Keep the cream felt colour and the warm backlit glow in every scene.</li>
      <li>Keep the eyes small, glossy and level: about 12% of the width, 20% apart.</li>
      <li>Show feelings with shape, tilt and light first, then add one light-beam mark.</li>
      <li>Let the world tint the cloud: peach at golden hour, lavender at night, grey in rain.</li>
      <li>Move slowly and buoyantly, with an ease in and a soft settle.</li>
    </ul>
  </div>
  <div class="dos dont">
    <h3>Don't</h3>
    <ul>
      <li>Add a mouth, eyebrows, arms or legs.</li>
      <li>Use hard outlines, flat cartoon colour or a plastic shine on the felt.</li>
      <li>Stack several symbols at once, or put symbols over the eyes.</li>
      <li>Use words in place of symbols.</li>
      <li>Snap between poses or move at one constant speed.</li>
    </ul>
  </div>
</div>
<div class="closing"><img src="img/react12.jpg" alt=""><p>A little light in every kind of day.</p></div>'''))

CSS = open('catalog.css').read()
FONTS = open('fonts/fonts.css').read()
doc = f'''<!doctype html><html><head><meta charset="utf-8"><title>The Journal Cloud: Character Catalog</title>
<style>{FONTS}\n{CSS}</style></head><body>{''.join(pages)}</body></html>'''
open('catalog.html', 'w').write(doc)
print(f'catalog.html: {len(pages)} pages')

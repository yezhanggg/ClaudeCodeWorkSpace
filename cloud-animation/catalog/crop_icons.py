# Cuts the four app-icon options out of the icon images, square, on pure white (each image's own off-white
# background is scaled to #fff so the icons sit cleanly on the white catalog page).
import numpy as np
from PIL import Image, ImageOps
U = '/root/.claude/uploads/b2c9e50c-cd7e-5ab0-9210-4ba358909790/'
def whiten(im):
    a = np.asarray(im).astype(np.float32); bg = a[6, 6]
    return Image.fromarray(np.clip(a * (255 / bg), 0, 255).astype(np.uint8))
def square(im, box, name, pad=26):
    x0, y0, x1, y1 = box
    c = ImageOps.expand(whiten(im).crop((x0, y0, x1, y1)), border=pad, fill=(255, 255, 255))   # pad in white, never into a neighbour
    s = max(c.size); c = ImageOps.pad(c, (s, s), color=(255, 255, 255))
    c.resize((900, 900), Image.LANCZOS).save(f'img/icon_{name}.jpg', quality=95)
pair = Image.open(U + '423f5464-image.png').convert('RGB')
square(pair, (16, 296, 622, 916), 'light')
square(pair, (632, 296, 1240, 916), 'dark')
square(Image.open(U + 'e69bad6d-image.png').convert('RGB'), (69, 77, 1184, 1180), 'sky', pad=50)
square(Image.open(U + 'e4e962c3-image.png').convert('RGB'), (124, 119, 1130, 1120), 'sunset', pad=50)

# Puts the hero (lit on black) onto white. The felt body (eyes included) is kept exactly as photographed; outside it,
# the glow's brightness becomes a pale peach halo that fades to pure white, so no dark fringe or image edge remains.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src = Image.open('img/hero_black.jpg').convert('RGB')
a = np.asarray(src).astype(np.float32) / 255
lum = a @ np.array([.299, .587, .114], np.float32)
body = Image.fromarray(((lum > .80) * 255).astype(np.uint8))
outside = body.point(lambda v: 255 - v)
ImageDraw.floodfill(outside, (0, 0), 128)
solid = Image.fromarray(((np.asarray(outside) != 128) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(3))
m = (np.asarray(solid).astype(np.float32) / 255)[..., None]
warm = np.array([1., .86, .62], np.float32)
glow = np.clip((lum - .04) / .80, 0, 1)[..., None] ** 1.3
halo = 1 - (1 - warm) * .50 * glow
out = halo * (1 - m) + a * m
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save('img/hero_white.jpg', quality=94)

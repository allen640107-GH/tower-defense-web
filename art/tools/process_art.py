#!/usr/bin/env python3
"""Turn Grok Imagine originals in art/src/ into game-ready webp files in img/.
Chroma-key removes the flat magenta background (colour sampled from the corners)."""
import os, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = B + '/art/src/'; OUT = B + '/img/'
os.makedirs(OUT, exist_ok=True)

def key(im, strong=False):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    c = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)])
    bg = np.median(c, 0)
    d = np.sqrt(((a - bg) ** 2).sum(2))
    # magenta-ness: high R & B, low G  (bg is magenta/pink)
    mag = np.clip((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) / 255.0, 0, 1)
    alpha = np.clip((d - 60) / 90.0, 0, 1)
    # pixels that are strongly magenta-ish and close in hue become transparent
    alpha = np.where((mag > 0.55) & (d < 150), np.minimum(alpha, (150 - d) / 150 * 0 + alpha * 0.5), alpha)
    # despill: pull magenta out of semi-transparent edges & halo
    spill = np.clip(np.minimum(a[..., 0], a[..., 2]) - a[..., 1] - 40, 0, 255)
    edge = (alpha < 0.98)[..., None]
    fix = a.copy()
    fix[..., 0] -= spill * 0.7; fix[..., 2] -= spill * 0.7
    a = np.where(edge, fix, a)
    if strong:
        alpha = alpha * (1 - np.clip((mag - 0.12) / 0.25, 0, 1))
    al = Image.fromarray((alpha * 255).astype(np.uint8))
    # remove isolated specks + slight erode of edge, then soften
    m = np.asarray(al) > 30
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 150])
        al = Image.fromarray(np.where(keep, np.asarray(al), 0).astype(np.uint8))
    al = al.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
    out.putalpha(al)
    return out

def trim(im, pad=4):
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))

def fit(im, mx):
    s = mx / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im

def save(im, name, q=84):
    im.save(OUT + name + '.webp', 'WEBP', quality=q, method=6)

def components(im, n):
    """split keyed sheet into n blobs ordered left-right/top-bottom (grid order)"""
    A = np.asarray(im.getchannel('A')) > 40
    A = ndimage.binary_dilation(A, iterations=6)
    lab, k = ndimage.label(A)
    objs = ndimage.find_objects(lab)
    sizes = [(ndimage.sum(A[o], lab[o] == i + 1), i, o) for i, o in enumerate(objs)]
    sizes.sort(reverse=True)
    sel = sizes[:n]
    return [(o, i + 1, lab) for _, i, o in sel]

def grid(im, rows, cols):
    W, H = im.size; out = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))
            A = np.asarray(cell.getchannel('A'))
            m = ndimage.binary_dilation(A > 30, iterations=8)
            lab, n = ndimage.label(m)
            if n > 1:
                sizes = ndimage.sum(m, lab, range(1, n + 1))
                big = int(np.argmax(sizes)) + 1
                keep = (lab == big) | np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.25])
                cell.putalpha(Image.fromarray(np.where(keep, A, 0).astype(np.uint8)))
            out.append(trim(cell))
    return out

# dinosaurs
for n, mx in [('raptor', 360), ('trike', 400), ('ankylo', 400), ('ptero', 400), ('brachio', 460), ('spino', 440), ('parasaur', 400), ('trex', 560)]:
    save(fit(trim(key(Image.open(SRC + f'dino_{n}.jpg'), strong=True)), mx), 'd_' + n)
# towers: 3 per sheet split by columns of mass
for t in ['spear', 'lava', 'frost', 'tesla', 'venom', 'amber']:
    k = key(Image.open(SRC + f'tower_{t}.jpg'))
    A = np.asarray(k.getchannel('A')) > 40
    col = A.sum(0)
    W = k.width
    # find two gaps near 1/3 and 2/3
    cuts = []
    for c in (W / 3, 2 * W / 3):
        lo, hi = int(c - W * 0.12), int(c + W * 0.12)
        seg = col[lo:hi]
        cuts.append(lo + int(np.argmin(seg)))
    xs = [0] + cuts + [W]
    for i in range(3):
        part = trim(k.crop((xs[i], 0, xs[i + 1], k.height)))
        save(fit(part, 300), f't_{t}{i + 1}')
# 3x3 sheets
names = {
 'ui': ['coin', 'heart', 'star', 'pause', 'speed', 'sound', 'horn', 'bone', 'amber'],
 'items': ['meteor', 'trap', 'airdrop', 'potion', 'frostbomb', 'goldbag', 'drum', 'dynamite', 'egg'],
 'fx': ['p_spear', 'p_lava', 'p_ice', 'p_zap', 'p_venom', 'p_amber', 'x_boom', 'x_frost', 'x_poison'],
 'props': ['boulder', 'amberrock', 'vent', 'cave', 'gate', 'digsite', 'mud', 'totem', 'ammonite'],
}
sz = {'ui': 192, 'items': 192, 'fx': 192, 'props': 300}
for sheet, nm in names.items():
    k = key(Image.open(SRC + f'sheet_{sheet}.jpg'))
    for im, n in zip(grid(k, 3, 3), nm):
        save(fit(im, sz[sheet]), ('i_' if sheet in ('ui', 'items') else '') + n)
# terrains -> 16:10 crop, 1280x800
for n in ['jungle', 'swamp', 'canyon', 'ice', 'volcano', 'nest', 'lair']:
    im = Image.open(SRC + f'terrain_{n}.jpg').convert('RGB')
    w, h = im.size; nw = int(h * 1.6); x = (w - nw) // 2
    im = im.crop((x, 0, x + nw, h)).resize((1280, 800), Image.LANCZOS)
    im.save(OUT + f'bg_{n}.webp', 'WEBP', quality=80, method=6)
for n in ['road_dirt', 'road_stone', 'panel_stone']:
    Image.open(SRC + n + '.jpg').convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT + n + '.webp', 'WEBP', quality=80, method=6)
Image.open(SRC + 'menu_bg.jpg').convert('RGB').save(OUT + 'menu_bg.webp', 'WEBP', quality=80, method=6)
Image.open(SRC + 'menu_bg_portrait.jpg').convert('RGB').save(OUT + 'menu_bg_portrait.webp', 'WEBP', quality=80, method=6)
print('done')

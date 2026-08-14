#!/usr/bin/env python3
"""批量生成炉石收藏缩略图（WebP，默认宽 384）。

读取本地原图目录（默认 E:/github/my-heartstone/hearthstone_cosmetics），
对 coins / card-backs / hero-skins 下所有图片生成 384px 宽的 WebP，
输出到同级的 384/ 子目录（保留 hero-skins 的职业子目录结构）。

本地 dev 直接由 server 的 express.static 服务该目录，无需上传即可预览；
生产环境再把生成的 384/*.webp 上传到 OSS（见 upload-cosmetic-thumbnails.mjs）。

用法：
  python scripts/gen-cosmetic-thumbnails.py [原图根目录] [宽度]
"""
import sys
import os
import glob
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'E:/github/my-heartstone/hearthstone_cosmetics'
WIDTH = int(sys.argv[2]) if len(sys.argv) > 2 else 384
TYPES = ['coins', 'card-backs', 'hero-skins']


def gen_one(src):
    d = os.path.dirname(src)
    name, _ext = os.path.splitext(os.path.basename(src))
    out_dir = os.path.join(d, str(WIDTH))
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, name + '.webp')
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
        return 'skip'
    with Image.open(src) as im:
        # 保留透明通道（卡背/硬币/英雄皮肤多为带透明 PNG）
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA')
        else:
            im = im.convert('RGB')
        if im.width > WIDTH:
            h = round(im.height * WIDTH / im.width)
            im = im.resize((WIDTH, h), Image.LANCZOS)
        im.save(out, 'WEBP', quality=82, method=4)
    return 'ok'


def main():
    total = ok = skip = err = 0
    for t in TYPES:
        base = os.path.join(ROOT, t)
        if not os.path.isdir(base):
            print(f'跳过不存在目录: {base}')
            continue
        for src in glob.glob(os.path.join(base, '**', '*.*'), recursive=True):
            if not src.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                continue
            if os.path.basename(os.path.dirname(src)) == str(WIDTH):
                continue
            total += 1
            try:
                r = gen_one(src)
                if r == 'ok':
                    ok += 1
                elif r == 'skip':
                    skip += 1
            except Exception as e:
                err += 1
                print(f'ERR {src}: {e}')
    print(f'完成: 扫描 {total}, 生成 {ok}, 跳过 {skip}, 失败 {err}')


if __name__ == '__main__':
    main()

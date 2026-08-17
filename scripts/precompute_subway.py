import json, math, urllib.request, os

OUT_DIR = 'E:/github/my-index/src/features/subway/data'
OUT = os.path.join(OUT_DIR, 'subwayData.json')
AMAP = 'https://map.amap.com/service/subway?_1469083453978&srhdata=1100_drw_beijing.json'


def fetch_json(url, timeout=40):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


print('拉取高德地铁线网数据...')
raw = fetch_json(AMAP)
lines_raw = raw['l']
print(f'原始线路数: {len(lines_raw)}')

lines = []
for ln in lines_raw:
    name = ln.get('ln') or ln.get('kn')
    if not name:
        continue
    loop = str(ln.get('lo')) == '1'
    stations = []
    seen = set()
    for s in ln.get('st', []):
        nm = s.get('n')
        sl = s.get('sl')
        if not nm or not sl:
            continue
        try:
            lng, lat = (float(x) for x in sl.split(','))
        except Exception:
            continue
        if nm in seen:
            continue
        seen.add(nm)
        stations.append({'n': nm, 'lng': round(lng, 6), 'lat': round(lat, 6)})
    if not stations:
        continue
    lines.append({'name': name, 'loop': loop, 'stations': stations})

# 统计去重站名数（用于说明）
all_names = set()
for l in lines:
    for s in l['stations']:
        all_names.add(s['n'])

os.makedirs(OUT_DIR, exist_ok=True)
out = {
    'source': 'amap beijing subway network (live)',
    'note': 'distance 为运行时按经纬度 haversine 计算的站间直线距离(米)，可作道路距离的良好近似',
    'lines': lines,
}
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
sz = os.path.getsize(OUT)
print(f'完成: {len(lines)} 条线, {len(all_names)} 个去重车站')
print(f'输出: {OUT} ({sz/1024:.1f} KB)')

import re,glob,json,html,collections
# Every setlist.fm entry at MSG: date, artist, tour, sub-venue (Infosys Theater shows are not the arena)
S=[]
for f in sorted(glob.glob('sources/setlistfm/p[0-9]*.html'),key=lambda x:int(re.search(r'p(\d+)',x)[1])):
    t=open(f,encoding='utf8',errors='replace').read()
    for b in t.split('setlistPreview">')[1:]:
        d=re.search(r'class="month">(\w+)</span>\s*<span class="day">(\d+)</span>\s*<span class="year">(\d+)',b)
        a=re.search(r'Artist: <strong><a href="[^"]*" title="[^"]*"><?[^>]*?>?([^<]+)</a>',b) or re.search(r'Artist: <strong><a[^>]*>(?:<span>)?([^<]+)',b)
        v=re.search(r'Venue:\s*<strong><a href="[^"]*" title="[^"]*">(?:<span>)?([^<]+)',b)
        tour=re.search(r'Tour:\s*<strong><a[^>]*>(?:<span>)?([^<]+)',b)
        if not d or not a: continue
        S.append(dict(date=f"{d[3]}-{d[1]}-{int(d[2]):02d}",artist=html.unescape(a[1].strip()),venue=html.unescape(v[1].strip()) if v else '',tour=html.unescape(tour[1].strip()) if tour else ''))
json.dump(S,open('shows.json','w'),indent=0)
print(len(S),S[0],S[-1])
print(collections.Counter(x['venue'] for x in S).most_common(8))

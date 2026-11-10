import re,glob,json,os,html
# Macklemore's monthly listeners and rank in every archived kworb snapshot
out=[]
for f in sorted(glob.glob('sources/wayback/snap/*.html'))+['sources/kworb/listeners.html']:
    t=open(f,encoding='utf8',errors='replace').read()
    rows=re.findall(r'<tr>(?:<td>(\d+)</td>)?<td class="text"><div><a href="artist/([^"_.]+)(?:_songs)?\.html">([^<]+)</a></div></td><td>([\d,]+)</td>',t)
    m=[r for r in rows if r[1]=='3JhNCzhSMTxs9WLGJJxWOY']
    ts=os.path.basename(f)[:-5]
    print(ts[:8] if ts!='listeners' else 'today', len(rows), (m[0][0] or '?') if m else '-', m[0][3] if m else 'absent', 'floor', rows[-1][3] if rows else '-')
    out.append(dict(ts=ts,n=len(rows),rank=(int(m[0][0]) if m[0][0] else rows.index(m[0])+1) if m else None,listeners=int(m[0][3].replace(',','')) if m else None,floor=int(rows[-1][3].replace(',','')) if rows else None))
json.dump(out,open('history.json','w'),indent=0)

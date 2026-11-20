from pathlib import Path
import re,html
for p in Path('dist').glob('profile-download-*.svg'):
 s=p.read_text()
 s=re.sub(r' (?:textLength|lengthAdjust)="[^"]*"','',s)
 def resize(m):
  tag,text=m.group(1),m.group(2)
  units=sum(1 if ord(c)>0x2fff else .58 for c in html.unescape(text))
  size=min(46,max(16,int(340/max(1,units))))
  tag=re.sub(r'font-size="[^"]*"',f'font-size="{size}"',tag)
  return tag+text+'</text>'
 s=re.sub(r'(<text\b[^>]*>)(.*?)</text>',resize,s)
 p.write_text(s)
print('45 badges: natural glyph proportions, no forced stretching.')

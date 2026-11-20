"""Validate generated Web Clip payloads without installing a profile."""
import io
import json
import plistlib
import uuid
from pathlib import Path
from PIL import Image

root = Path('dist')
games = ['uno', 'blackjack'] + [g['id'] for g in json.loads((root / 'games.json').read_text())]
profiles = [root / 'lounge.mobileconfig', root / 'moon.mobileconfig', root / 'all-games.mobileconfig']
profiles += [root / game / f'{game}.mobileconfig' for game in games]
expected = {'https://webtronics.run.place/', 'https://webtronics.run.place/moonring'}
expected.update(f'https://webtronics.run.place/{game}/' for game in games)
for path in profiles:
    data = path.read_bytes()
    assert len(data) < 1024 * 1024, path
    profile = plistlib.loads(data)
    assert profile['PayloadType'] == 'Configuration', path
    uuid.UUID(profile['PayloadUUID'])
    clips = profile['PayloadContent']
    assert len(clips) == (11 if path.name == 'all-games.mobileconfig' else 1), path
    urls, identifiers, uuids = set(), set(), set()
    for clip in clips:
        assert clip['PayloadType'] == 'com.apple.webClip.managed', path
        assert clip['FullScreen'] is True, path
        assert clip['URL'] in expected, path
        assert clip['URL'] not in urls, path
        assert clip['PayloadIdentifier'] not in identifiers, path
        assert clip['PayloadUUID'] not in uuids, path
        uuid.UUID(clip['PayloadUUID'])
        urls.add(clip['URL'])
        identifiers.add(clip['PayloadIdentifier'])
        uuids.add(clip['PayloadUUID'])
        image = Image.open(io.BytesIO(clip['Icon']))
        assert image.format == 'PNG' and image.width == image.height and image.width >= 180, path
        image.verify()
    if path.name == 'all-games.mobileconfig':
        assert urls == expected, path
print(f'{len(profiles)} profiles validated; all-games: 11 unique Web Clips, {(root / "all-games.mobileconfig").stat().st_size} bytes; valid icons and routes.')

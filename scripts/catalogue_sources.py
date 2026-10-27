"""The local WeDrive source registry. Absolute paths stay outside Git."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.catalogue-sync'
ACTIVE = ('binoculars','astronomical-telescopes','monoculars','riflescopes',
          'spotting-scopes','night-vision','thermal-en','thermal-zh','mounts-clamps','magnifiers')

def load_config():
    path = LOCAL / 'config.json'
    if not path.is_file():
        raise RuntimeError(f'Missing local source configuration: {path}')
    config = json.loads(path.read_text(encoding='utf-8'))
    if set(config['sources']) != set(ACTIVE):
        raise RuntimeError('Source configuration must contain the ten active catalogues')
    return config

def source_path(slug):
    return Path(load_config()['sources'][slug])

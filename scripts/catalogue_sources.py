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
        raise RuntimeError(f'缺少本机源文件配置： {path}')
    config = json.loads(path.read_text(encoding='utf-8'))
    if set(config['sources']) != set(ACTIVE):
        raise RuntimeError('源文件配置必须包含全部 10 本启用的画册')
    return config

def source_path(slug):
    return Path(load_config()['sources'][slug])

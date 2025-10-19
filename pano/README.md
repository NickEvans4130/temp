# Pano Image Downloader

Downloads Street View images from Geonections JSON files.

## Usage

```bash
pip install aiohttp
python download_images.py
```

Enter your Google Street View API key when prompted.

## Dry Run

```bash
python download_images.py --dry-run
```

Shows what needs downloading without actually downloading.

## What it does

- Reads all `Geonections_*.json` files from the `grids/` directory
- Downloads missing images using new naming format: `{panoid}~d{YYYY-MM}~h{heading}~p{pitch}~z{zoom}.jpg`
- Skips existing images
- Async downloads (10 concurrent)

## Files

- `{panoid}~d{YYYY-MM}~h{heading}~p{pitch}~z{zoom}.jpg` - Street View images
- `{panoid}~d{YYYY-MM}~h{heading}~p{pitch}~z{zoom}~thumb.jpg` - Thumbnail images
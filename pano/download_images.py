#!/usr/bin/env python3
"""
Download Street View images from Geonections JSON files.

This script reads all *.json files from ui/public/puzzles/, extracts panoId data,
and downloads high-quality Street View images by first trying direct
downloads from geonections.com/pano/id/, then falling back to using
Playwright to load our download.html file and take screenshots.

Uses the new naming format: {panoid}~d{YYYY-MM}~h{heading}~p{pitch}~z{zoom}.jpg
"""

import asyncio
import json
import os
import sys
import time
import socket
import threading
import requests
from pathlib import Path
from urllib.parse import urlencode
from http.server import HTTPServer, SimpleHTTPRequestHandler

from playwright.async_api import async_playwright
from PIL import Image

# Configuration
SCREENSHOT_WIDTH = 2400
SCREENSHOT_HEIGHT = 1600
MAX_CONCURRENT_BROWSERS = 2  # Reduced to prevent resource exhaustion


def round_number(num, decimals=2):
    """Round to 2 decimal places, strip trailing zeros and dot"""
    rounded = round(float(num), decimals)
    if rounded == int(rounded):
        return str(int(rounded))
    return str(rounded)


def try_direct_download(pano_id, heading=0, pitch=0, zoom=0, date="2024-01"):
    """Try to directly download images from geonections.com/pano/img/"""
    print(f"Trying direct download for panoId: {pano_id}")
    
    # Try different URL patterns that might work
    test_urls = [
        f"https://geonections.com/pano/img/{pano_id}~d{date}~h{heading}~p{pitch}~z{zoom}.jpg",
    ]
    
    for url in test_urls:
        try:
            print(f"  Trying: {url}")
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                # Check if it's actually an image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    print(f"  ✓ SUCCESS: {url} returned image (size: {len(response.content)} bytes)")
                    return url, response.content
                else:
                    print(f"  ✗ Not an image: {content_type}")
            else:
                print(f"  ✗ HTTP {response.status_code}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    print(f"  ✗ No direct download available for {pano_id}")
    return None, None


async def download_pano_image_direct(tile, output_dir):
    """Download a single pano image directly from geonections.com if possible."""
    # Get panoId from either top level or extra object
    pano_id = tile.get('panoId') or tile.get('extra', {}).get('panoId')
    if not pano_id:
        print(f"ERROR: No panoId found in tile data")
        return None
    
    # Get actual values from the tile data
    heading = round_number(tile.get('heading', 0))
    pitch = round_number(tile.get('pitch', 0))
    zoom = int(tile.get('zoom', 0))
    
    # Get date from extra.panoDate, fallback to current date
    date = tile.get('extra', {}).get('panoDate', '2024-01')
    if not date:
        print(f"WARNING: No panoDate found for {pano_id}, using 2024-01")
        date = '2024-01'
    
    # Try direct download
    url, content = try_direct_download(pano_id, heading, pitch, zoom, date)
    
    if url and content:
        try:
            # Generate filename using the new naming format
            base_filename = create_new_filename(tile)
            full_filename = base_filename
            thumb_filename = base_filename.replace('.jpg', '~thumb.jpg')
            
            # Save the image
            with open(output_dir / full_filename, 'wb') as f:
                f.write(content)
            
            # Create thumbnail
            full_image = Image.open(output_dir / full_filename)
            thumb_image = full_image.resize((400, 300), Image.Resampling.LANCZOS)
            thumb_image.save(output_dir / thumb_filename, "JPEG", quality=85)
            
            print(f"✓ Direct download: {full_filename} + {thumb_filename}")
            return [full_filename, thumb_filename]
            
        except Exception as e:
            print(f"✗ Error saving direct download for {pano_id}: {e}")
            return None
    
    return None


def create_new_filename(tile):
    """Create new filename based on spec: {panoid}~d{YYYY-MM}~h{heading}~p{pitch}~z{zoom}.jpg"""
    # Get panoId from either top level or extra object
    pano_id = tile.get('panoId') or tile.get('extra', {}).get('panoId')
    if not pano_id:
        raise ValueError("No panoId found in tile data")
    
    # Try to get date from extra.panoDate, fallback to current date
    date = tile.get('extra', {}).get('panoDate', '2024-01')
    if not date:
        print(f"WARNING: No panoDate found for {pano_id}, using 2024-01")
        date = '2024-01'
    
    # Get actual values from the tile data
    heading = round_number(tile.get('heading', 0))
    pitch = round_number(tile.get('pitch', 0))
    zoom = int(tile.get('zoom', 0))
    
    
    return f"{pano_id}~d{date}~h{heading}~p{pitch}~z{zoom}.jpg"


def find_free_port():
    """Find a free port to use for the HTTP server."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


class HTTPHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler to serve files from the project root."""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve from (project root)
        project_root = Path(__file__).parent.parent
        super().__init__(*args, directory=str(project_root), **kwargs)
    
    def log_message(self, format, *args):
        """Suppress default logging to reduce noise."""
        pass


def start_http_server(port):
    """Start an HTTP server in a separate thread."""
    server = HTTPServer(('localhost', port), HTTPHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


class BrowserPool:
    """Manages a pool of browser instances for concurrent processing."""
    
    def __init__(self, max_browsers):
        self.max_browsers = max_browsers
        self.browsers = []
        self.available = asyncio.Queue()
        self.playwright = None
        
    async def initialize(self):
        """Initialize the browser pool."""
        self.playwright = await async_playwright().start()
        
        for _ in range(self.max_browsers):
            browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096'
                ]
            )
            self.browsers.append(browser)
            await self.available.put(browser)
    
    async def get_browser(self):
        """Get an available browser from the pool."""
        return await self.available.get()
    
    async def return_browser(self, browser):
        """Return a browser to the pool."""
        await self.available.put(browser)
    
    async def close_all(self):
        """Close all browsers in the pool."""
        for browser in self.browsers:
            await browser.close()
        if self.playwright:
            await self.playwright.stop()


async def download_pano_image(browser_pool, tile, api_key, output_dir, http_port, skip_direct_download=False):
    """Download a single pano image, trying direct download first, then fallback to download.html."""
    # First try direct download from geonections.com (unless disabled)
    if not skip_direct_download:
        print(f"Trying direct download first...")
        direct_result = await download_pano_image_direct(tile, output_dir)
        if direct_result:
            return direct_result
        print(f"Direct download failed, falling back to browser method...")
    else:
        print(f"Skipping direct download, using browser method...")
    
    # Fallback to browser method
    browser = await browser_pool.get_browser()
    
    try:
        # Create a new page
        page = await browser.new_page()
        
        # Set viewport size for full resolution
        await page.set_viewport_size({
            "width": SCREENSHOT_WIDTH,
            "height": SCREENSHOT_HEIGHT
        })
        
        # Build URL for our download.html with the tile data
        base_url = f"http://localhost:{http_port}/pano/download.html"
        params = {
            "key": api_key,
            "heading": tile.get("heading", 0),
            "pitch": tile.get("pitch", 0),
            "zoom": tile.get("zoom", 0),
        }
        
        # Must have panoId - no fallback to lat/lng
        pano_id = None
        if "panoId" in tile and tile["panoId"] is not None and tile["panoId"]:
            pano_id = tile["panoId"]
        elif "extra" in tile and isinstance(tile["extra"], dict) and "panoId" in tile["extra"] and tile["extra"]["panoId"] is not None and tile["extra"]["panoId"]:
            pano_id = tile["extra"]["panoId"]
        
        if not pano_id:
            print(f"ERROR: Tile missing panoId in both main field and extra.panoId")
            raise ValueError("Tile must have panoId - no fallback to lat/lng allowed")
        
        params["pano"] = pano_id
        
        url = f"{base_url}?{urlencode(params)}"
        
        # Add console logging to capture any warnings or errors
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type.upper()}] {msg.text}"))
        
        # Navigate to our download.html page
        try:
            await page.goto(url, wait_until="networkidle", timeout=60000)
        except Exception as e:
            print(f"Navigation failed for {pano_id}: {e}")
            return None
        
        # Wait for the pano to load (check for the pano element to be visible)
        await page.wait_for_selector("#pano", timeout=30000)
        
        # Wait for the panorama to actually load by checking the flag set by download.html
        try:
            await page.wait_for_function("window.panoLoaded === true", timeout=30000)
            # Give it a moment to fully render
            await asyncio.sleep(1)
        except Exception as e:
            print(f"⚠ Warning: Panorama may not have loaded properly for {pano_id}: {e}")
            # Still continue, but we'll detect black screens later
        
        # Generate filenames using the new naming format
        try:
            base_filename = create_new_filename(tile)
            full_filename = base_filename
            thumb_filename = base_filename.replace('.jpg', '~thumb.jpg')
        except Exception as e:
            print(f"ERROR: Failed to create filename for tile: {e}")
            return None
        
        # Take screenshot of the pano element (full resolution)
        pano_element = await page.query_selector("#pano")
        if pano_element:
            # Save full resolution image
            await pano_element.screenshot(path=output_dir / full_filename)
            
            # Check if the screenshot is mostly black
            full_image = Image.open(output_dir / full_filename)
            # Convert to grayscale and check average brightness
            gray_image = full_image.convert('L')
            avg_brightness = sum(gray_image.getdata()) / len(gray_image.getdata())
            
            if avg_brightness < 10:  # Very dark image
                print(f"⚠ Warning: Screenshot appears to be black/dark for {pano_id} (avg brightness: {avg_brightness:.1f})")
            
            # Create thumbnail (downscaled)
            thumb_image = full_image.resize((400, 300), Image.Resampling.LANCZOS)
            thumb_image.save(output_dir / thumb_filename, "JPEG", quality=85)
            
            print(f"✓ Downloaded: {full_filename} + {thumb_filename}")
            return [full_filename, thumb_filename]
        else:
            print(f"✗ Failed to find pano element for {pano_id}")
            return None
        
    except Exception as e:
        print(f"✗ Error downloading {tile.get('panoId', 'unknown')}: {e}")
        return None
    finally:
        await page.close()
        await browser_pool.return_browser(browser)


async def process_json_file_async(json_file, browser_pool, api_key, http_port, skip_direct_download=False):
    """Process a single JSON file and download all images."""
    print(f"Processing {json_file.name}...")
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        # Extract tiles from the JSON structure
        tiles = []
        if isinstance(data, list):
            tiles = data
        elif isinstance(data, dict) and "customCoordinates" in data:
            tiles = data["customCoordinates"]
        elif isinstance(data, dict) and "tiles" in data:
            tiles = data["tiles"]
        elif isinstance(data, dict) and "data" in data:
            tiles = data["data"]
        else:
            print(f"Unknown JSON structure in {json_file.name}")
            return []
    
        if not tiles:
            print(f"No tiles found in {json_file.name}")
            return []
    
        print(f"Found {len(tiles)} tiles in {json_file.name}")
        
        # Create output directory
        output_dir = Path(__file__).parent / "img"
        output_dir.mkdir(exist_ok=True)
        
        # Check which images are needed
        needed_tiles = []
        thumb_only_tiles = []  # Tiles that need thumb generation from existing full
        
        for tile in tiles:
            # Get panoId from main field or extra field
            pano_id = None
            if "panoId" in tile and tile["panoId"] is not None and tile["panoId"]:
                pano_id = tile["panoId"]
            elif "extra" in tile and isinstance(tile["extra"], dict) and "panoId" in tile["extra"] and tile["extra"]["panoId"] is not None and tile["extra"]["panoId"]:
                pano_id = tile["extra"]["panoId"]
            
            if not pano_id:
                print(f"Skipping tile without panoId in both main field and extra.panoId: {tile}")
                continue
            
            # Generate new format filenames
            try:
                base_filename = create_new_filename(tile)
                full_filename = base_filename
                thumb_filename = base_filename.replace('.jpg', '~thumb.jpg')
            except Exception as e:
                print(f"ERROR: Failed to create filename for tile {pano_id}: {e}")
                continue
            
            # Check if full and thumb images exist
            full_exists = (output_dir / full_filename).exists()
            thumb_exists = (output_dir / thumb_filename).exists()
            
            if not full_exists and not thumb_exists:
                # Neither exists - need to download both
                needed_tiles.append(tile)
            elif not full_exists and thumb_exists:
                # Only thumb exists - need to download full and regenerate thumb
                needed_tiles.append(tile)
            elif full_exists and not thumb_exists:
                # Only full exists - can generate thumb from existing full
                thumb_only_tiles.append(tile)
            # If both exist, skip entirely
        
        if not needed_tiles and not thumb_only_tiles:
            print(f"All images already exist for {json_file.name}")
            return []
        
        downloaded = []
        
        # Download images for needed tiles
        if needed_tiles:
            print(f"Need to download {len(needed_tiles)} images from {json_file.name}")
            for i, tile in enumerate(needed_tiles):
                print(f"  [{i+1}/{len(needed_tiles)}] Processing tile...")
                filenames = await download_pano_image(browser_pool, tile, api_key, output_dir, http_port, skip_direct_download)
                if filenames:
                    downloaded.extend(filenames)
        
        # Generate thumbs for tiles that only need thumb generation
        if thumb_only_tiles:
            print(f"Generating {len(thumb_only_tiles)} thumbnails from existing full images...")
            for i, tile in enumerate(thumb_only_tiles):
                try:
                    base_filename = create_new_filename(tile)
                    full_filename = base_filename
                    thumb_filename = base_filename.replace('.jpg', '~thumb.jpg')
                    
                    full_path = output_dir / full_filename
                    thumb_path = output_dir / thumb_filename
                    
                    # Load the existing full image and create thumbnail
                    full_image = Image.open(full_path)
                    thumb_image = full_image.resize((400, 300), Image.Resampling.LANCZOS)
                    thumb_image.save(thumb_path, "JPEG", quality=85)
                    print(f"  [{i+1}/{len(thumb_only_tiles)}] Generated: {thumb_filename}")
                    downloaded.append(thumb_filename)
                except Exception as e:
                    pano_id = tile.get('panoId') or tile.get('extra', {}).get('panoId', 'unknown')
                    print(f"  [{i+1}/{len(thumb_only_tiles)}] Error generating thumb for {pano_id}: {e}")
        
        print(f"Processed {len(downloaded)} images from {json_file.name}")
        return downloaded
        
    except Exception as e:
        print(f"Error processing {json_file.name}: {e}")
        return []


def prune_orphaned_images(delete_orphans=False):
    """Find and optionally delete JPG files that aren't referenced by any JSON files."""
    print("PRUNE - Finding orphaned images")
    print("=" * 50)
    
    # Get the script directory and parent directory
    script_dir = Path(__file__).parent
    img_dir = script_dir / "img"  # Images go in pano/img/
    parent_dir = script_dir.parent
    
    # Find all Geonections JSON files
    puzzles_dir = parent_dir / "ui" / "public" / "puzzles"
    json_files = list(puzzles_dir.glob("*.json"))
    
    if not json_files:
        print("No *.json files found in ui/public/puzzles directory")
        return
    
    print(f"Scanning {len(json_files)} puzzle JSON files...")
    
    # Build set of expected filenames by walking through each tile
    expected_files = set()
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Extract tiles from the JSON structure
            tiles = []
            if isinstance(data, list):
                tiles = data
            elif isinstance(data, dict) and "customCoordinates" in data:
                tiles = data["customCoordinates"]
            elif isinstance(data, dict) and "tiles" in data:
                tiles = data["tiles"]
            elif isinstance(data, dict) and "data" in data:
                tiles = data["data"]
            
            # Generate expected filenames for each tile
            for tile in tiles:
                pano_id = tile.get('panoId') or tile.get('extra', {}).get('panoId')
                if not pano_id:
                    continue
                
                try:
                    # Generate expected filename using new format
                    expected_filename = create_new_filename(tile)
                    expected_files.add(expected_filename)  # Full image
                    expected_files.add(expected_filename.replace('.jpg', '~thumb.jpg'))  # Thumbnail
                except Exception as e:
                    print(f"Warning: Could not generate filename for {pano_id}: {e}")
        
        except Exception as e:
            print(f"Error reading {json_file}: {e}")
    
    print(f"Found {len(expected_files)} expected files")
    
    # Find all JPG files in the img directory
    actual_files = set(f.name for f in img_dir.glob("*.jpg"))
    print(f"Found {len(actual_files)} actual JPG files")
    
    # Find orphaned files (files that exist but aren't expected)
    orphaned_files = []
    for filename in actual_files:
        if filename not in expected_files:
            orphaned_files.append(img_dir / filename)
    
    if not orphaned_files:
        print("✓ No orphaned files found!")
        return
    
    print(f"\nFound {len(orphaned_files)} orphaned files:")
    for i, file in enumerate(orphaned_files, 1):
        print(f"  {i:3d}. {file.name}")
    
    if delete_orphans:
        print(f"\nDeleting {len(orphaned_files)} orphaned files...")
        deleted_count = 0
        for file in orphaned_files:
            try:
                file.unlink()  # Delete the file
                print(f"✓ Deleted: {file.name}")
                deleted_count += 1
            except Exception as e:
                print(f"✗ Error deleting {file.name}: {e}")
        
        print(f"\nDeleted {deleted_count} orphaned files")
    else:
        # Ask for confirmation
        print(f"\nThese {len(orphaned_files)} files are not referenced by any JSON files.")
        response = input("Do you want to delete them? (y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            deleted_count = 0
            for file in orphaned_files:
                try:
                    file.unlink()  # Delete the file
                    print(f"✓ Deleted: {file.name}")
                    deleted_count += 1
                except Exception as e:
                    print(f"✗ Error deleting {file.name}: {e}")
            
            print(f"\nDeleted {deleted_count} orphaned files")
        else:
            print("No files deleted")


def dry_run():
    """Show what would be downloaded without actually downloading."""
    print("DRY RUN - No images will be downloaded")
    print("=" * 50)
    
    # Get the script directory and parent directory
    script_dir = Path(__file__).parent
    img_dir = script_dir / "img"  # Images go in pano/img/
    parent_dir = script_dir.parent
    
    # Find all Geonections JSON files
    puzzles_dir = parent_dir / "ui" / "public" / "puzzles"
    json_files = list(puzzles_dir.glob("*.json"))
    
    if not json_files:
        print("No *.json files found in ui/public/puzzles directory")
        return
    
    print(f"Scanning {len(json_files)} puzzle JSON files...")
    
    # Build set of expected filenames by walking through each tile
    expected_files = set()
    total_tiles = 0
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Extract tiles from the JSON structure
            tiles = []
            if isinstance(data, list):
                tiles = data
            elif isinstance(data, dict) and "customCoordinates" in data:
                tiles = data["customCoordinates"]
            elif isinstance(data, dict) and "tiles" in data:
                tiles = data["tiles"]
            elif isinstance(data, dict) and "data" in data:
                tiles = data["data"]
            
            print(f"{json_file.name}: {len(tiles)} tiles")
            
            # Generate expected filenames for each tile
            for tile in tiles:
                total_tiles += 1
                pano_id = tile.get('panoId') or tile.get('extra', {}).get('panoId')
                if not pano_id:
                    continue
                
                try:
                    # Generate expected filename using new format
                    expected_filename = create_new_filename(tile)
                    expected_files.add(expected_filename)  # Full image
                    expected_files.add(expected_filename.replace('.jpg', '~thumb.jpg'))  # Thumbnail
                except Exception as e:
                    print(f"Warning: Could not generate filename for {pano_id}: {e}")
        
        except Exception as e:
            print(f"Error reading {json_file}: {e}")
    
    print(f"Found {len(expected_files)} expected files from {total_tiles} tiles")
    
    # Find all JPG files in the img directory
    actual_files = set(f.name for f in img_dir.glob("*.jpg"))
    print(f"Found {len(actual_files)} actual JPG files")
    
    # Find missing files (expected but don't exist)
    missing_files = expected_files - actual_files
    missing_full = sum(1 for f in missing_files if not f.endswith('~thumb.jpg'))
    missing_thumb = sum(1 for f in missing_files if f.endswith('~thumb.jpg'))
    
    # Find orphaned files (exist but not expected)
    orphaned_files = actual_files - expected_files
    
    print(f"\nMissing files: {len(missing_files)}")
    print(f"  - Full images: {missing_full}")
    print(f"  - Thumbnails: {missing_thumb}")
    print(f"Orphaned files: {len(orphaned_files)}")
    
    if missing_files:
        print(f"\nFirst 10 missing files:")
        for i, filename in enumerate(sorted(missing_files)[:10], 1):
            print(f"  {i:2d}. {filename}")
        if len(missing_files) > 10:
            print(f"  ... and {len(missing_files) - 10} more")
    
    if orphaned_files:
        print(f"\nFirst 10 orphaned files:")
        for i, filename in enumerate(sorted(orphaned_files)[:10], 1):
            print(f"  {i:2d}. {filename}")
        if len(orphaned_files) > 10:
            print(f"  ... and {len(orphaned_files) - 10} more")


async def process_single_pano(pano_id, api_key=None, skip_direct_download=False):
    """Process a single pano ID for testing."""
    print(f"Processing single pano: {pano_id}")
    
    # Look up the actual tile data from JSON files
    script_dir = Path(__file__).parent
    parent_dir = script_dir.parent
    puzzles_dir = parent_dir / "ui" / "public" / "puzzles"
    json_files = list(puzzles_dir.glob("*.json"))
    
    tile = None
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
            
            # Extract tiles from the JSON structure
            tiles = []
            if isinstance(data, list):
                tiles = data
            elif isinstance(data, dict) and "customCoordinates" in data:
                tiles = data["customCoordinates"]
            elif isinstance(data, dict) and "tiles" in data:
                tiles = data["tiles"]
            elif isinstance(data, dict) and "data" in data:
                tiles = data["data"]
            
            # Look for the pano ID
            for t in tiles:
                if (t.get('panoId') == pano_id or 
                    t.get('extra', {}).get('panoId') == pano_id):
                    tile = t
                    break
            
            if tile:
                break
        except Exception as e:
            print(f"Error reading {json_file}: {e}")
    
    if not tile:
        print(f"ERROR: Pano ID {pano_id} not found in any JSON files")
        return
    
    print(f"Found tile data: {tile}")
    
    # Create output directory
    output_dir = Path(__file__).parent / "img"
    output_dir.mkdir(exist_ok=True)
    
    # Try direct download first (unless disabled)
    if not skip_direct_download:
        print("Trying direct download first...")
        direct_result = await download_pano_image_direct(tile, output_dir)
        if direct_result:
            print(f"Successfully downloaded via direct method: {direct_result}")
            return
    else:
        print("Skipping direct download, using browser method...")
    
    # If direct download fails and we have an API key, try browser method
    if api_key:
        print("Direct download failed, trying browser method...")
        
        # Find a free port and start HTTP server
        port = find_free_port()
        server, server_thread = start_http_server(port)
        print(f"Started HTTP server on port {port}")
        
        # Initialize browser pool
        browser_pool = BrowserPool(1)
        await browser_pool.initialize()
        
        try:
            # Download the image using browser method
            filename = await download_pano_image(browser_pool, tile, api_key, output_dir, port, skip_direct_download)
            if filename:
                print(f"Successfully downloaded via browser method: {filename}")
            else:
                print("Failed to download image with both methods")
        finally:
            await browser_pool.close_all()
            server.shutdown()
    else:
        print("Direct download failed and no API key provided for fallback")


async def main_async():
    """Main async function to process all JSON files."""
    print("Geonections Image Downloader (Direct download + download.html fallback)")
    print("=" * 50)
    print("Usage: python download_images.py [--no-direct] [--dry-run] [--prune] [--delete-orphans] [--single <pano_id>]")
    print("Flags:")
    print("  --no-direct      Skip direct download, use browser method only")
    print("  --dry-run        Show what would be downloaded without downloading")
    print("  --prune          Interactive orphan cleanup")
    print("  --delete-orphans Non-interactive orphan cleanup")
    print("  --single <id>    Process a single pano ID")
    print("=" * 50)
    
    # Check for flags that don't need API key first
    if len(sys.argv) > 1 and sys.argv[1] == "--dry-run":
        dry_run()
        return
    
    if len(sys.argv) > 1 and sys.argv[1] == "--prune":
        prune_orphaned_images()
        return
    
    if len(sys.argv) > 1 and sys.argv[1] == "--delete-orphans":
        prune_orphaned_images(delete_orphans=True)
        return
    
    # Check for single pano mode first (before API key prompt)
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        if len(sys.argv) < 3:
            print("Usage: python download_images.py --single <pano_id> [--no-direct]")
            print("Example: python download_images.py --single ABC123")
            print("Example: python download_images.py --single ABC123 --no-direct")
            print("Will try direct download first, then browser method if API key available")
            return
        
        pano_id = sys.argv[2]
        # Check if --no-direct flag is present
        single_skip_direct = "--no-direct" in sys.argv
        # Try to get API key from environment or prompt
        fallback_api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not fallback_api_key:
            fallback_api_key = input("Enter your Google Maps API key: ").strip()
            if not fallback_api_key:
                print("No API key provided. Exiting.")
                return
        await process_single_pano(pano_id, fallback_api_key, single_skip_direct)
        return
    
    # Check for --no-direct flag
    skip_direct_download = False
    if len(sys.argv) > 1 and sys.argv[1] == "--no-direct":
        skip_direct_download = True
        print("Direct download disabled - using browser method only")
    elif len(sys.argv) > 2 and sys.argv[2] == "--no-direct":
        skip_direct_download = True
        print("Direct download disabled - using browser method only")
    
    # Get API key from environment or prompt
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        api_key = input("Enter your Google Maps API key: ").strip()
        if not api_key:
            print("No API key provided. Exiting.")
            return
    
    # Find a free port and start HTTP server
    port = find_free_port()
    server, server_thread = start_http_server(port)
    print(f"Started HTTP server on port {port}")
    
    # Test the HTTP server
    import requests
    try:
        response = requests.get(f"http://localhost:{port}/pano/download.html", timeout=5)
        if response.status_code == 200:
            print("✓ HTTP server is responding correctly")
        else:
            print(f"⚠ HTTP server returned status {response.status_code}")
    except Exception as e:
        print(f"⚠ HTTP server test failed: {e}")
    
    # Get the parent directory (where JSON files are)
    script_dir = Path(__file__).parent
    img_dir = script_dir / "img"  # Images go in pano/img/
    parent_dir = script_dir.parent
    
    # Find all Geonections JSON files
    puzzles_dir = parent_dir / "ui" / "public" / "puzzles"
    json_files = list(puzzles_dir.glob("*.json"))
    
    if not json_files:
        print("No *.json files found in ui/public/puzzles directory")
        server.shutdown()
        return
    
    print(f"Found {len(json_files)} puzzle JSON files to process")
    print(f"Using {MAX_CONCURRENT_BROWSERS} concurrent browser instances")
    print()
    
    # Initialize browser pool
    browser_pool = BrowserPool(MAX_CONCURRENT_BROWSERS)
    await browser_pool.initialize()
    
    try:
        all_downloaded = []
        start_time = time.time()
        
        # Process JSON files sequentially to avoid resource exhaustion
        for json_file in sorted(json_files):
            try:
                result = await process_json_file_async(json_file, browser_pool, api_key, port, skip_direct_download)
                all_downloaded.extend(result)
            except Exception as e:
                print(f"Error processing {json_file.name}: {e}")
        
        total_duration = time.time() - start_time
        
        # Count existing images (new format only)
        existing_images = [f for f in os.listdir(script_dir) if f.endswith('.jpg') and '~d' in f and '~h' in f and '~p' in f and '~z' in f]
        
        print("=" * 50)
        print(f"Download complete!")
        print(f"New images downloaded: {len(all_downloaded)}")
        print(f"Total images: {len(existing_images)}")
        print(f"Total time: {total_duration:.1f}s")
        
    finally:
        # Clean up browser pool and server
        await browser_pool.close_all()
        server.shutdown()


def main():
    """Main function wrapper for async execution."""
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
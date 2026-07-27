#!/usr/bin/env python3
"""Index test audio tracks and celebrity voices into the fingerprint DB.

Usage:
    python scripts/index_test_tracks.py                          # index all from tests/fixtures/audio/
    python scripts/index_test_tracks.py --track path/to/track.mp3 --artist "Name" --title "Track"
    python scripts/index_test_tracks.py --voice path/to/voice.wav --name "Celebrity Name"

For now uses synthetic 5-second WAV files from tests/fixtures/audio/.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.audio_engine.audio_fingerprinter import (
    index_celebrity_voice,
    index_track,
)


def main():
    parser = argparse.ArgumentParser(description="Index test tracks and voices")
    parser.add_argument("--track", type=str, help="Path to audio file for track indexing")
    parser.add_argument("--artist", type=str, default="", help="Artist name")
    parser.add_argument("--title", type=str, default="", help="Track title")
    parser.add_argument("--voice", type=str, help="Path to audio file for voice indexing")
    parser.add_argument("--name", type=str, default="", help="Celebrity name")
    parser.add_argument("--profession", type=str, default="", help="Celebrity profession")
    parser.add_argument("--all", action="store_true", help="Index all test fixtures")
    args = parser.parse_args()

    if args.all:
        _index_all_fixtures()
    elif args.track and args.artist and args.title:
        n = index_track(args.track, args.artist.lower().replace(" ", "_"), args.artist, args.title)
        print(f"Indexed {n} hashes for {args.artist} — {args.title}")
    elif args.voice and args.name:
        ok = index_celebrity_voice(args.voice, args.name, args.profession)
        print(f"{'OK' if ok else 'FAIL'} celebrity voice: {args.name}")
    else:
        parser.print_help()


def _index_all_fixtures():
    audio_dir = Path("tests/fixtures/audio")
    if not audio_dir.exists():
        print(f"Fixture dir not found: {audio_dir}")
        return

    for f in audio_dir.glob("*"):
        if f.suffix.lower() in (".wav", ".mp3", ".m4a", ".flac"):
            track_id = f.stem.lower().replace(" ", "_")
            n = index_track(str(f), track_id, "Test Artist", f.stem)
            print(f"  [{n} hashes] {f.name}")


if __name__ == "__main__":
    main()

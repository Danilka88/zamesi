from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from src.audio_engine.audio_fingerprinter import (
    FingerprintDB,
    _find_peaks,
    _generate_hashes,
    analyze_audio_for_monetization,
    detect_celebrity,
    fingerprint_audio,
    index_track,
    match_audio,
)
from src.core.schemas import CelebrityVoice, MusicMatch, TrackMetadata


class TestFingerprintDB:
    def test_init_creates_empty_db(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        assert db.track_count == 0
        assert db.hash_count == 0

    def test_add_and_match_track(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        meta = TrackMetadata(artist="Test Artist", track_name="Test Track", genre="pop")
        hashes = [(hash("a"), 0), (hash("b"), 10), (hash("c"), 20)]
        db.add_track("track_1", meta, hashes)
        assert db.track_count == 1
        assert db.hash_count == 3

        results = db.match_hashes([(hash("a"), 5), (hash("b"), 15)])
        assert len(results) == 1
        tid, score, count = results[0]
        assert tid == "track_1"
        assert score == 1.0
        assert count == 2

    def test_match_no_results(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        meta = TrackMetadata(artist="A", track_name="B")
        db.add_track("t1", meta, [(hash("x"), 0)])
        results = db.match_hashes([(hash("z"), 0)])
        assert results == []

    def test_match_empty_query(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        assert db.match_hashes([]) == []

    def test_get_track(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        meta = TrackMetadata(artist="A", track_name="B")
        db.add_track("t1", meta, [(hash("x"), 0)])
        retrieved = db.get_track("t1")
        assert retrieved is not None
        assert retrieved.artist == "A"
        assert retrieved.track_name == "B"
        assert db.get_track("nonexistent") is None

    def test_persistence(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db1 = FingerprintDB(db_path=db_path)
        db1.add_track("t1", TrackMetadata(artist="A", track_name="B"), [(hash("x"), 0)])
        db2 = FingerprintDB(db_path=db_path)
        assert db2.track_count == 1
        assert db2.hash_count == 1

    def test_add_track_updates_existing(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        db.add_track("t1", TrackMetadata(artist="A", track_name="B"), [(hash("x"), 0)])
        db.add_track("t1", TrackMetadata(artist="A2", track_name="B2"), [(hash("y"), 5)])
        assert db.track_count == 1
        assert db.get_track("t1").track_name == "B2"

    def test_ranked_matches(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        db.add_track("t1", TrackMetadata(artist="A", track_name="B"), [
            (hash("a"), 0), (hash("b"), 10), (hash("c"), 20),
        ])
        db.add_track("t2", TrackMetadata(artist="C", track_name="D"), [
            (hash("a"), 0), (hash("b"), 10),
        ])
        results = db.match_hashes([(hash("a"), 5), (hash("b"), 15), (hash("c"), 25)])
        assert len(results) == 2
        assert results[0][0] == "t1"
        assert results[0][1] > results[1][1]

    def test_empty_db_persistence_no_crash(self, tmp_path):
        db_path = tmp_path / "fp.json"
        db = FingerprintDB(db_path=db_path)
        assert db.track_count == 0
        assert db.hash_count == 0


class TestFingerprintAudio:
    @patch("src.audio_engine.audio_fingerprinter._load_audio")
    @patch("src.audio_engine.audio_fingerprinter._compute_spectrogram")
    @patch("src.audio_engine.audio_fingerprinter._find_peaks")
    def test_fingerprint_audio_success(self, mock_peaks, mock_spec, mock_load, tmp_path):
        audio = tmp_path / "test.wav"
        audio.write_text("fake")
        mock_load.return_value = (np.zeros(16000), 16000)
        mock_spec.return_value = np.random.rand(1025, 32)
        mock_peaks.return_value = [(25, 500), (50, 600), (75, 700)]
        hashes = fingerprint_audio(str(audio))
        assert isinstance(hashes, list)
        assert len(hashes) > 0
        for h, offset in hashes:
            assert isinstance(h, int)
            assert isinstance(offset, int)

    def test_fingerprint_audio_file_not_found(self):
        hashes = fingerprint_audio("/nonexistent/file.wav")
        assert hashes == []

    @patch("src.audio_engine.audio_fingerprinter._load_audio")
    @patch("src.audio_engine.audio_fingerprinter._compute_spectrogram")
    def test_fingerprint_audio_no_peaks(self, mock_spec, mock_load):
        mock_load.return_value = (np.zeros(16000), 16000)
        mock_spec.return_value = np.zeros((1025, 32))
        hashes = fingerprint_audio("/fake/path.wav")
        assert hashes == []


class TestFindPeaks:
    def test_find_peaks_basic(self):
        spec = np.zeros((50, 50))
        spec[25, 25] = 1.0
        peaks = _find_peaks(spec)
        assert len(peaks) >= 1

    def test_find_peaks_flat_spectrum(self):
        spec = np.ones((50, 50))
        peaks = _find_peaks(spec)
        assert len(peaks) == 0


class TestGenerateHashes:
    def test_generate_hashes_basic(self):
        peaks = [(10, 100), (20, 200), (30, 300)]
        hashes = _generate_hashes(peaks, fan_value=2)
        assert len(hashes) > 0
        for h, offset in hashes:
            assert isinstance(h, int)
            assert isinstance(offset, int)

    def test_generate_hashes_empty_peaks(self):
        assert _generate_hashes([]) == []

    def test_generate_hashes_single_peak(self):
        assert _generate_hashes([(10, 100)]) == []


class TestMatchAudio:
    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_match_audio_returns_matches(self, mock_get_db, tmp_path):
        mock_db = MagicMock()
        mock_db.track_count = 2
        mock_db.match_hashes.return_value = [("t1", 0.8, 5)]
        mock_db.get_track.return_value = TrackMetadata(
            artist="A", track_name="B", genre="pop",
        )
        mock_get_db.return_value = mock_db
        db_path = tmp_path / "fp.json"
        db_path.write_text("{}")

        with patch("src.audio_engine.audio_fingerprinter.fingerprint_audio") as mock_fp:
            mock_fp.return_value = [(hash("x"), 0)]
            results = match_audio(str(db_path))
            assert len(results) == 1
            assert results[0].artist == "A"
            assert results[0].track_name == "B"
            assert results[0].confidence == 0.8

    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_match_audio_empty_db(self, mock_get_db):
        mock_db = MagicMock()
        mock_db.track_count = 0
        mock_get_db.return_value = mock_db
        assert match_audio("/fake.wav") == []

    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_match_audio_below_threshold(self, mock_get_db):
        mock_db = MagicMock()
        mock_db.track_count = 2
        mock_db.match_hashes.return_value = [("t1", 0.3, 2)]
        mock_db.get_track.return_value = TrackMetadata(artist="A", track_name="B")
        mock_get_db.return_value = mock_db

        with patch("src.audio_engine.audio_fingerprinter.fingerprint_audio") as mock_fp:
            mock_fp.return_value = [(hash("x"), 0)]
            results = match_audio("/fake.wav", min_confidence=0.5)
            assert results == []

    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_match_audio_no_fingerprint(self, mock_get_db):
        mock_db = MagicMock()
        mock_db.track_count = 2
        mock_get_db.return_value = mock_db

        with patch("src.audio_engine.audio_fingerprinter.fingerprint_audio") as mock_fp:
            mock_fp.return_value = []
            results = match_audio("/fake.wav")
            assert results == []


class TestIndexTrack:
    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_index_track_success(self, mock_get_db, tmp_path):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        with patch("src.audio_engine.audio_fingerprinter.fingerprint_audio") as mock_fp:
            mock_fp.return_value = [(hash("x"), 0), (hash("y"), 10)]
            count = index_track(
                audio_path="/fake.wav",
                track_id="test_track",
                artist="Test Artist",
                track_name="Test Track",
                genre="rock",
            )
            assert count == 2
            mock_db.add_track.assert_called_once()

    @patch("src.audio_engine.audio_fingerprinter._get_db")
    def test_index_track_no_hashes(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        with patch("src.audio_engine.audio_fingerprinter.fingerprint_audio") as mock_fp:
            mock_fp.return_value = []
            count = index_track("/fake.wav", "t1", "A", "B")
            assert count == 0


class TestDetectCelebrity:
    @patch("src.audio_engine.audio_fingerprinter._get_speaker_embedding")
    def test_detect_celebrity_success(self, mock_embed):
        mock_embed.return_value = [0.1] * 256
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            "ids": [["known_artist"]],
            "distances": [[0.15]],
            "metadatas": [[{"name": "Known Artist", "profession": "singer"}]],
        }

        with patch("src.core.embedding.get_chroma_client") as mock_client:
            mock_client.return_value.get_collection.return_value = mock_collection
            result = detect_celebrity("/fake.wav", min_confidence=0.5)
            assert result is not None
            assert isinstance(result, CelebrityVoice)
            assert result.name == "Known Artist"
            assert result.confidence >= 0.5

    @patch("src.audio_engine.audio_fingerprinter._get_speaker_embedding")
    def test_detect_celebrity_below_threshold(self, mock_embed):
        mock_embed.return_value = [0.1] * 256
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            "ids": [["unknown"]],
            "distances": [[0.7]],
            "metadatas": [[{"name": "Unknown", "profession": ""}]],
        }

        with patch("src.core.embedding.get_chroma_client") as mock_client:
            mock_client.return_value.get_collection.return_value = mock_collection
            result = detect_celebrity("/fake.wav", min_confidence=0.5)
            assert result is None

    @patch("src.audio_engine.audio_fingerprinter._get_speaker_embedding")
    def test_detect_celebrity_no_collection(self, mock_embed):
        mock_embed.return_value = [0.1] * 256

        with patch("src.core.embedding.get_chroma_client") as mock_client:
            mock_client.return_value.get_collection.side_effect = ValueError("not found")
            result = detect_celebrity("/fake.wav")
            assert result is None

    @patch("src.audio_engine.audio_fingerprinter._get_speaker_embedding")
    def test_detect_celebrity_embedding_fails(self, mock_embed):
        mock_embed.return_value = None
        result = detect_celebrity("/fake.wav")
        assert result is None

    def test_index_celebrity_voice(self):
        with (
            patch("src.audio_engine.audio_fingerprinter._get_speaker_embedding") as mock_embed,
            patch("src.core.embedding.get_chroma_client") as mock_client,
        ):
            mock_embed.return_value = [0.1] * 256
            mock_collection = MagicMock()
            mock_client.return_value.get_or_create_collection.return_value = mock_collection

            from src.audio_engine.audio_fingerprinter import index_celebrity_voice
            result = index_celebrity_voice(
                audio_path="/fake.wav",
                name="Test Celebrity",
                profession="actor",
            )
            assert result is True
            mock_collection.add.assert_called_once()


class TestAnalyzeAudioForMonetization:
    @pytest.mark.asyncio
    async def test_both_enabled(self):
        with (
            patch("src.audio_engine.audio_fingerprinter.match_audio") as mock_match,
            patch("src.audio_engine.audio_fingerprinter.detect_celebrity") as mock_celeb,
        ):
            mock_match.return_value = [
                MusicMatch(track_name="Song", artist="Artist", confidence=0.9),
            ]
            mock_celeb.return_value = CelebrityVoice(
                name="Famous Person", profession="singer", confidence=0.85,
            )
            music, celeb = await analyze_audio_for_monetization("/fake.wav")
            assert len(music) == 1
            assert music[0].track_name == "Song"
            assert celeb is not None
            assert celeb.name == "Famous Person"

    @pytest.mark.asyncio
    async def test_match_audio_fails_gracefully(self):
        with (
            patch("src.audio_engine.audio_fingerprinter.match_audio") as mock_match,
            patch("src.audio_engine.audio_fingerprinter.detect_celebrity") as mock_celeb,
        ):
            mock_match.side_effect = RuntimeError("fingerprint error")
            mock_celeb.return_value = None
            music, celeb = await analyze_audio_for_monetization("/fake.wav")
            assert music == []
            assert celeb is None

    @pytest.mark.asyncio
    async def test_celebrity_fails_gracefully(self):
        with (
            patch("src.audio_engine.audio_fingerprinter.match_audio") as mock_match,
            patch("src.audio_engine.audio_fingerprinter.detect_celebrity") as mock_celeb,
        ):
            mock_match.return_value = []
            mock_celeb.side_effect = RuntimeError("celeb error")
            music, celeb = await analyze_audio_for_monetization("/fake.wav")
            assert music == []
            assert celeb is None

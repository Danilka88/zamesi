from unittest.mock import patch

import numpy as np
import pytest
import torch
from sklearn.cluster import SpectralClustering

from src.audio_engine.diarization_speechbrain import (
    _estimate_clusters,
    _merge_segments,
    _remap_labels,
    diarize,
)
from src.core.exceptions import DiarizationError

# --- Pure helper tests ---

def test_merge_segments_empty():
    assert _merge_segments([], gap_sec=0.5) == []


def test_merge_segments_no_gap():
    result = _merge_segments([(0.0, 2.0), (2.3, 4.0)], gap_sec=0.5)
    assert result == [(0.0, 4.0)]


def test_merge_segments_with_gap():
    result = _merge_segments([(0.0, 2.0), (5.0, 7.0)], gap_sec=0.5)
    assert result == [(0.0, 2.0), (5.0, 7.0)]


def test_merge_segments_adjacent():
    result = _merge_segments([(0.0, 2.0), (2.5, 4.0)], gap_sec=0.5)
    assert result == [(0.0, 4.0)]


def test_estimate_clusters_single():
    assert _estimate_clusters(["a"]) == 1


def test_estimate_clusters_two():
    assert _estimate_clusters(["a", "b"]) == 1


def test_estimate_clusters_three():
    result = _estimate_clusters(["a", "b", "c"])
    assert result >= 2


def test_estimate_clusters_large():
    result = _estimate_clusters([f"e{i}" for i in range(20)])
    assert 2 <= result <= 4


def test_remap_labels_basic():
    result = _remap_labels([0, 1, 0])
    assert result == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_00"]


def test_remap_labels_single():
    result = _remap_labels([0, 0, 0])
    assert result == ["SPEAKER_00", "SPEAKER_00", "SPEAKER_00"]


def test_remap_labels_non_contiguous():
    result = _remap_labels([0, 2, 5])
    assert result == ["SPEAKER_00", "SPEAKER_01", "SPEAKER_02"]


# --- diarize tests ---

@pytest.mark.asyncio
async def test_diarize_file_not_found():
    with pytest.raises(DiarizationError, match="not found"):
        await diarize("/nonexistent/audio.wav")


class _FakeClassifier:
    def encode_batch(self, chunk):
        return torch.rand(1, 192)

    @classmethod
    def from_hparams(cls, **kw):
        return cls()


@pytest.mark.asyncio
async def test_diarize_no_speech(tmp_path):
    audio = tmp_path / "test.wav"
    audio.write_text("fake wav")

    with (
        patch("src.audio_engine.diarization_speechbrain.torchaudio.load") as mock_load,
        patch("src.audio_engine.diarization_speechbrain._vad_segments") as mock_vad,
        patch(
            "speechbrain.inference.speaker.EncoderClassifier",
            _FakeClassifier,
        ),
    ):
        mock_load.return_value = (torch.zeros(1, 16000), 16000)
        mock_vad.return_value = []
        result = await diarize(str(audio))
    assert result == []


@pytest.mark.asyncio
async def test_diarize_single_speaker(tmp_path):
    sr = 16000
    audio = tmp_path / "test.wav"
    audio.write_text("fake wav")

    with (
        patch("src.audio_engine.diarization_speechbrain.torchaudio.load") as mock_load,
        patch("src.audio_engine.diarization_speechbrain._vad_segments") as mock_vad,
        patch("speechbrain.inference.speaker.EncoderClassifier", _FakeClassifier),
    ):
        mock_load.return_value = (torch.zeros(1, sr * 8), sr)
        mock_vad.return_value = [(0.0, 3.0), (5.0, 8.0)]
        result = await diarize(str(audio))
    assert len(result) == 2
    assert all(s.speaker == "SPEAKER_00" for s in result)
    assert result[0].start_sec == 0.0
    assert result[1].end_sec == 8.0


@pytest.mark.asyncio
async def test_diarize_multi_speaker(tmp_path):
    sr = 16000
    audio = tmp_path / "test.wav"
    audio.write_text("fake wav")

    fake_clustering = SpectralClustering(n_clusters=2, affinity="cosine", random_state=0)
    fake_clustering.labels_ = np.array([0, 1, 0, 1])

    with (
        patch("src.audio_engine.diarization_speechbrain.torchaudio.load") as mock_load,
        patch("src.audio_engine.diarization_speechbrain._vad_segments") as mock_vad,
        patch("src.audio_engine.diarization_speechbrain._merge_segments") as mock_merge,
        patch("speechbrain.inference.speaker.EncoderClassifier", _FakeClassifier),
        patch("sklearn.cluster.SpectralClustering.fit", return_value=fake_clustering),
    ):
        mock_load.return_value = (torch.zeros(1, sr * 10), sr)
        mock_vad.return_value = [(0.0, 2.0), (2.5, 4.5), (5.0, 7.0), (7.5, 9.5)]
        mock_merge.return_value = [(0.0, 2.0), (2.5, 4.5), (5.0, 7.0), (7.5, 9.5)]
        result = await diarize(str(audio))

    assert len(result) == 4
    speakers = set(s.speaker for s in result)
    assert speakers == {"SPEAKER_00", "SPEAKER_01"}

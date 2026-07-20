from pathlib import Path

import pytest

from src.api.pipeline import run_pipeline
from src.core.schemas import JobStatus


@pytest.mark.skipif(
    not list(Path(__file__).parent.glob("fixtures/videos/*.mp4")),
    reason="No test video files found in tests/fixtures/videos/",
)
@pytest.mark.asyncio
async def test_pipeline_howto_video(mock_ollama_response):
    videos = list(Path(__file__).parent.glob("fixtures/videos/how_to_*.mp4"))
    if not videos:
        videos = list(Path(__file__).parent.glob("fixtures/videos/*.mp4"))
    if not videos:
        pytest.skip("No video files available")
    video_path = str(videos[0])
    temp_dir = Path(video_path).parent
    job_id = "test_howto_001"

    from src.api.routes import _jobs as routes_jobs
    from src.core.schemas import JobResult
    routes_jobs.set(job_id, JobResult(job_id=job_id, status=JobStatus.pending))

    from src.core.logging_config import get_logger
    log = get_logger(correlation_id=job_id)

    await run_pipeline(job_id, video_path, temp_dir, routes_jobs, log=log)

    result = routes_jobs.get(job_id)
    assert result is not None
    assert result.status == JobStatus.done
    assert result.metrics is not None
    assert result.passport is not None
    assert result.passport.frontmatter.video_id == Path(video_path).stem

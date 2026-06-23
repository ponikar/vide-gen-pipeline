# TODO

## Job persistence across restarts

Both video-server (JobQueue) and agent-worker (5-phase pipeline) are fully
in-memory — jobs are lost on restart. The DB (`video_jobs` table) only gets a
record during the publishing phase (phase 4/5), so early-phase crashes leave
zero trace.

### Needed for restart resilience
- Write-ahead: INSERT `video_jobs` with `status='pending'` at pipeline start
- Video-server: persist render jobs in DB so it can recover on boot
- Startup recovery: re-queue pending renders, mark orphaned cron runs as failed
- Optional: `retry_count` column for automatic retry on failure

alter table atelier_accounts add column if not exists video_month text not null default '';
alter table atelier_accounts add column if not exists videos_used integer not null default 0;
alter table atelier_accounts add column if not exists extra_videos integer not null default 0;

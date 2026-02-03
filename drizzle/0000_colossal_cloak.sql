-- Initial schema migration
-- Uses IF NOT EXISTS to handle existing databases gracefully

CREATE TABLE IF NOT EXISTS `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`input_cost_usd` real NOT NULL,
	`output_cost_usd` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_type` text NOT NULL,
	`repo_full_name` text,
	`pr_number` integer,
	`pr_title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `custom_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `daily_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`event_count` integer NOT NULL,
	`analyzed_repos` text,
	`analyzed_prs` text,
	`generation_duration_ms` integer,
	`tools_used` text,
	`thinking` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`thinking` text,
	`display_label` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_messages_conversation_id` ON `messages`(`conversation_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ai_usage_created_at` ON `ai_usage`(`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_daily_reports_date` ON `daily_reports`(`date`);
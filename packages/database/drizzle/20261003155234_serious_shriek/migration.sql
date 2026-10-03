CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);

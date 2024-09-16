CREATE TABLE `contractAbi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	`address` text,
	`signature` text,
	`event` text,
	`chain` integer,
	`abi` text,
	`type` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `contractMeta` (
	`address` text,
	`chain` integer,
	`contractName` text,
	`tokenSymbol` text,
	`decimals` integer,
	`type` text,
	`status` text,
	PRIMARY KEY(`address`, `chain`)
);

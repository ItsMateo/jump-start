import { config as loadEnv } from "dotenv";

loadEnv();

export interface Config {
	discord: {
		token: string;
		guildId: string;
	};
	voting: {
		requiredRoleId: string;
		votesRequired: number;
		voteTimeout: number;
	};
}

function parseConfig(): Config {
	const getRequiredEnv = (key: string): string => {
		const value = process.env[key];
		if (!value) {
			throw new Error(`Missing required environment variable: ${key}`);
		}
		return value;
	};

	const getOptionalEnv = (key: string, defaultValue: string): string => {
		return process.env[key] || defaultValue;
	};

	const getNumberEnv = (key: string, defaultValue: number): number => {
		const value = process.env[key];
		if (!value) return defaultValue;
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			throw new Error(`Invalid number for environment variable ${key}: ${value}`);
		}
		return parsed;
	};

	return {
		discord: {
			token: getRequiredEnv("DISCORD_TOKEN"),
			guildId: getRequiredEnv("DISCORD_GUILD_ID"),
		},
		voting: {
			requiredRoleId: getRequiredEnv("REQUIRED_ROLE_ID"),
			votesRequired: getNumberEnv("VOTES_REQUIRED", 2),
			voteTimeout: getNumberEnv("VOTE_TIMEOUT", 120),
		},
	};
}

export const config = parseConfig();

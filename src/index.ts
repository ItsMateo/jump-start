import { DiscordBot } from "./bot.js";

async function main() {
	console.log("Starting Jump Start Bot...");

	const bot = new DiscordBot();

	process.on("SIGINT", async () => {
		console.log("\nReceived SIGINT, shutting down gracefully...");
		await bot.stop();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\nReceived SIGTERM, shutting down gracefully...");
		await bot.stop();
		process.exit(0);
	});

	try {
		await bot.start();
	} catch (error) {
		console.error("Failed to start bot:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Unhandled error:", error);
	process.exit(1);
});

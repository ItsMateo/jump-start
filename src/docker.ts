import { spawn } from "node:child_process";

export interface DockerResult {
	success: boolean;
	output: string;
	error?: string;
}

export class DockerManager {
	async startContainer(): Promise<DockerResult> {
		return new Promise((resolve) => {
			const args = ["compose", "-f", "/app/target-compose.yml", "up", "-d"];

			const process = spawn("docker", args, {
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";

			process.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			process.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			process.on("close", (code) => {
				const success = code === 0;
				const truncatedError = success
					? undefined
					: stderr.length > 1000
						? `${stderr.substring(0, 1000)}...`
						: stderr;
				resolve({
					success,
					output: stdout,
					error: truncatedError,
				});
			});

			process.on("error", (error) => {
				resolve({
					success: false,
					output: "",
					error: error.message,
				});
			});
		});
	}

	async getContainerStatus(): Promise<DockerResult & { running: boolean }> {
		return new Promise((resolve) => {
			const args = ["compose", "-f", "/app/target-compose.yml", "ps", "--format", "json"];

			const process = spawn("docker", args, {
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";

			process.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			process.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			process.on("close", (code) => {
				const success = code === 0;
				let running = false;

				if (success && stdout.trim()) {
					try {
						const containers = stdout
							.trim()
							.split("\n")
							.map((line) => JSON.parse(line));

						running = containers.some((container) => container.State === "running");
					} catch {
						running = false;
					}
				}

				const truncatedError = success
					? undefined
					: stderr.length > 1000
						? `${stderr.substring(0, 1000)}...`
						: stderr;

				resolve({
					success,
					output: stdout,
					error: truncatedError,
					running,
				});
			});

			process.on("error", (error) => {
				resolve({
					success: false,
					output: "",
					error: error.message,
					running: false,
				});
			});
		});
	}
}

export const dockerManager = new DockerManager();

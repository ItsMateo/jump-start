import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type ChatInputCommandInteraction,
	Client,
	Collection,
	EmbedBuilder,
	GatewayIntentBits,
	type GuildMember,
	MessageFlags,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";
import { config } from "./config.js";
import { dockerManager } from "./docker.js";
import { votingManager } from "./voting.js";

export class DiscordBot {
	private client: Client;
	private commands: Collection<
		string,
		{
			data: SlashCommandBuilder;
			execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
		}
	>;

	constructor() {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		this.commands = new Collection();
		this.setupCommands();
		this.setupEventHandlers();
	}

	private setupCommands() {
		const requestVoteCmd = new SlashCommandBuilder()
			.setName("request-vote")
			.setDescription("Create a voting message");

		this.commands.set("request-vote", {
			data: requestVoteCmd,
			execute: this.handleServerStart.bind(this),
		});
	}

	private setupEventHandlers() {
		this.client.once("clientReady", async () => {
			console.log(`Logged in as ${this.client.user?.tag}`);
		});

		this.client.on("interactionCreate", async (interaction) => {
			if (interaction.isChatInputCommand()) {
				await this.handleSlashCommand(interaction);
			} else if (interaction.isButton()) {
				await this.handleButtonInteraction(interaction);
			}
		});
	}

	private async handleSlashCommand(interaction: ChatInputCommandInteraction) {
		const command = this.commands.get(interaction.commandName);

		if (!command) {
			await interaction.reply({
				content: "Unknown command!",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error("Error executing command:", error);
			const content = "There was an error executing this command!";

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content, flags: MessageFlags.Ephemeral });
			}
		}
	}

	private async handleButtonInteraction(interaction: ButtonInteraction) {
		if (interaction.customId === "jump_start:persistent") {
			await this.handleVoteButton(interaction);
		}
	}

	private async handleVoteButton(interaction: ButtonInteraction) {
		try {
			const containerStatus = await dockerManager.getContainerStatus();
			if (containerStatus.running) {
				await interaction.reply({
					content: "Your vote was not cast since the container is already running!",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		} catch (error) {
			console.error("Error checking container status:", error);
		}

		const member = interaction.member as GuildMember;
		if (!member.roles.cache.has(config.voting.requiredRoleId)) {
			await interaction.reply({
				content: "You don't have the required permissions to vote!",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const sessionId = "persistent_vote_session";

		let session = votingManager.getSession(sessionId);

		if (!session) {
			session = votingManager.createSession(
				sessionId,
				async () => {
					await this.executeServerStart(interaction);
				},
				async () => {
					await this.sendVoteExpired(interaction);
				}
			);
		}

		const voteAdded = votingManager.addVote(sessionId, interaction.user);

		if (!voteAdded) {
			await interaction.reply({
				content:
					"You have already voted! Please wait for the current voting session to complete or expire.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const status = votingManager.getVoteStatus(sessionId);

		if (!status) {
			await interaction.reply({
				content: `${interaction.user} voted to start the container! Starting now...`,
			});
		} else {
			await interaction.reply({
				content: `${interaction.user} voted to start the container (${status.current}/${status.required})`,
			});
		}
	}

	private async handleServerStart(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;
		if (!member.roles.cache.has(config.voting.requiredRoleId)) {
			await interaction.reply({
				content: "You don't have the required permissions to vote!",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await this.createVotingMessage(interaction);
	}

	private async executeServerStart(interaction: ChatInputCommandInteraction | ButtonInteraction) {
		const channel = interaction.channel;
		if (!channel || !("send" in channel)) return;

		const embed = new EmbedBuilder()
			.setColor(0xffea00)
			.setTitle("Starting Container")
			.setDescription("The container is starting up...")
			.setTimestamp();

		await channel.send({ embeds: [embed] });

		const result = await dockerManager.startContainer();

		const resultEmbed = new EmbedBuilder()
			.setColor(result.success ? 0x00ff00 : 0xff0000)
			.setTitle(result.success ? "Container Started" : "Failed to Start Container")
			.setTimestamp();

		if (result.success) {
			resultEmbed.setDescription("The container is now running!");
		} else {
			// Truncate error message to prevent Discord validation issues
			const errorMsg = result.error || "Unknown error";
			const truncatedError =
				errorMsg.length > 500 ? `${errorMsg.substring(0, 500)}...` : errorMsg;
			resultEmbed.setDescription(`Failed to start container: ${truncatedError}`);

			if (result.output && result.output.length > 0) {
				const truncatedOutput =
					result.output.length > 1000
						? `${result.output.substring(0, 1000)}...`
						: result.output;
				resultEmbed.addFields({
					name: "Error Details",
					value: `\`\`\`\n${truncatedOutput}\`\`\``,
				});
			}
		}

		await channel.send({ embeds: [resultEmbed] });
	}

	private async sendVoteExpired(interaction: ChatInputCommandInteraction | ButtonInteraction) {
		const channel = interaction.channel;
		if (!channel || !("send" in channel)) return;

		const embed = new EmbedBuilder()
			.setColor(0x888888)
			.setTitle("Vote Expired")
			.setDescription(
				"The vote to start the container has expired since not enough votes were received in time."
			)
			.setTimestamp();

		await channel.send({ embeds: [embed] });
	}

	private async createVotingMessage(interaction: ChatInputCommandInteraction) {
		const embed = new EmbedBuilder()
			.setColor(0xff9900)
			.setTitle("Vote to Start")
			.setDescription(
				`Click the button below to vote for starting the container\n\n${config.voting.votesRequired} votes are required!`
			);

		const voteButton = new ButtonBuilder()
			.setCustomId("jump_start:persistent")
			.setLabel("Cast Vote")
			.setStyle(ButtonStyle.Primary)
			.setEmoji("🚀");

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(voteButton);

		await interaction.reply({
			embeds: [embed],
			components: [row],
		});

		const channelName =
			interaction.channel && "name" in interaction.channel
				? interaction.channel.name
				: "unknown";

		console.log(`Created voting message in #${channelName}`);
	}

	async start() {
		await this.client.login(config.discord.token);
		await this.registerCommands();
	}

	async stop() {
		this.client.destroy();
	}

	private async registerCommands() {
		const rest = new REST().setToken(config.discord.token);

		try {
			console.log("Started refreshing application (/) commands.");

			const commandData = this.commands.map((command) => command.data.toJSON());

			await rest.put(
				Routes.applicationGuildCommands(this.client.user!.id, config.discord.guildId),
				{ body: commandData }
			);

			console.log("Successfully reloaded application (/) commands.");
		} catch (error) {
			console.error("Error registering commands:", error);
		}
	}
}

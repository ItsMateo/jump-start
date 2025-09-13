import type { User } from "discord.js";
import { config } from "./config.js";

export interface VoteSession {
	id: string;
	votes: Set<string>;
	createdAt: Date;
	timeout: NodeJS.Timeout;
	onComplete: () => void;
	onExpire: () => void;
}

class VotingManager {
	private sessions = new Map<string, VoteSession>();

	createSession(sessionId: string, onComplete: () => void, onExpire: () => void): VoteSession {
		this.endSession(sessionId);

		const session: VoteSession = {
			id: sessionId,
			votes: new Set(),
			createdAt: new Date(),
			timeout: setTimeout(() => {
				this.endSession(sessionId);
				onExpire();
			}, config.voting.voteTimeout * 1000),
			onComplete,
			onExpire,
		};

		this.sessions.set(sessionId, session);
		return session;
	}

	addVote(sessionId: string, user: User): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return false;
		}

		if (session.votes.has(user.id)) {
			return false;
		}

		session.votes.add(user.id);

		if (session.votes.size >= config.voting.votesRequired) {
			this.endSession(sessionId);
			session.onComplete();
			return true;
		}

		return true;
	}

	removeVote(sessionId: string, user: User): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return false;
		}

		return session.votes.delete(user.id);
	}

	getSession(sessionId: string): VoteSession | undefined {
		return this.sessions.get(sessionId);
	}

	endSession(sessionId: string): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return false;
		}

		clearTimeout(session.timeout);
		this.sessions.delete(sessionId);
		return true;
	}

	getVoteStatus(
		sessionId: string
	): { current: number; required: number; voters: string[] } | null {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		return {
			current: session.votes.size,
			required: config.voting.votesRequired,
			voters: Array.from(session.votes),
		};
	}

	getRemainingTime(sessionId: string): number | null {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		const elapsed = Date.now() - session.createdAt.getTime();
		const remaining = config.voting.voteTimeout * 1000 - elapsed;
		return Math.max(0, Math.ceil(remaining / 1000));
	}
}

export const votingManager = new VotingManager();

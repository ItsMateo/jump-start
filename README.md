# Jump Start

A simple Discord bot that 'jump starts' Docker Compose containers via a voting system

## Getting Started

### 1. Clone and Setup

```bash
git clone <your-repo>
cd jump-start
```

### 2. Install Dependencies (Uses Bun)

```bash
bun install
```

### 3. Configuration

Copy and configure environment variables:
```bash
cp env.example .env
```

### 4. Configure the Docker Compose File

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - /absolute/path/to/your/docker-compose.yml:/app/target-compose.yml:ro
```


### 5. Run the Container

```bash
docker compose up -d
```

## Configuration Options

### Environment Variables

All configuration is done through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | Required |
| `DISCORD_GUILD_ID` | Discord server ID | Required |
| `REQUIRED_ROLE_ID` | Role ID that can vote | Required |
| `VOTES_REQUIRED` | Number of votes needed | 2 |
| `VOTE_TIMEOUT` | Vote timeout in seconds | 120 |

## Usage

### Available Commands

- `/request-vote` - Creates a voting message in the current channel

# Setup Claude Code v2.0.53 MCP Integration

## Configuration File Location

Create the configuration file at the appropriate location for your OS:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Configuration JSON

For **Claude Desktop** users, add the following configuration to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "imgs3": {
      "command": "node",
      "args": ["/full/path/to/mcp-server.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Replace `/full/path/to/mcp-server.js` with the absolute path to the `mcp-server.js` file in this repository.

## Setup Steps

### 1. Start the REST API (required)

```bash
npm install
npm start
```

The API will be available at `http://localhost:3000`

### 2. Add MCP Server to Claude CLI

Run the following command to register the `imgs3` MCP server:

```bash
claude mcp add --transport stdio imgs3 --env API_BASE_URL=http://localhost:3000 -- node /home/mrpink/hmzoo/imgs3/mcp-server.js
```

Or replace the path with the absolute path to your `mcp-server.js` file:

```bash
claude mcp add --transport stdio imgs3 --env API_BASE_URL=http://localhost:3000 -- node /path/to/imgs3/mcp-server.js
```

### 3. Verify Installation

```bash
claude mcp list
```

You should see `imgs3` in the list of available MCP servers.

### 4. Test in Claude

- Ask Claude to use the image upload tools
- Try commands like:
  - "Upload an image from URL"
  - "Generate an S3 URL"

## Alternative: Manual Configuration (Claude Desktop)

If using Claude Desktop instead of CLI, you can manually configure the MCP server by editing the configuration file:

### Create/Update Configuration File

**Configuration File Location**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Add the following JSON**



## Configuration Fields

| Field | Description |
|-------|-------------|
| `command` | Node.js executable to run the MCP server |
| `args` | Array containing the absolute path to `mcp-server.js` |
| `env.API_BASE_URL` | Base URL for the REST API (default: http://localhost:3000) |

## Troubleshooting

- **MCP Server not loading**: Ensure the path to `mcp-server.js` is absolute and correct
- **API connection failed**: Make sure the REST API is running with `npm start`
- **Configuration not applied**: Restart Claude Code completely after editing the config file

## File Structure

```
/path/to/imgs3/
├── mcp-server.js          # The MCP server
├── index.js               # REST API
├── package.json
├── SETUP-CLAUDE.md        # This file
└── ... other files
```

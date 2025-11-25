#!/bin/bash

# Setup script for Claude Desktop MCP integration
# Run: bash setup-claude.sh

CLAUDE_CONFIG_DIR="$HOME/.claude"
CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude.json"
MCP_SERVER_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mcp-server.js"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo "🔧 Setting up Claude Desktop MCP Integration"
echo "=========================================="
echo ""

# Create .claude directory if it doesn't exist
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "📁 Creating $CLAUDE_CONFIG_DIR..."
    mkdir -p "$CLAUDE_CONFIG_DIR"
    echo "✅ Directory created"
else
    echo "✅ $CLAUDE_CONFIG_DIR exists"
fi

# Backup existing configuration if it exists
if [ -f "$CLAUDE_CONFIG" ]; then
    echo ""
    echo "⚠️  Found existing claude.json"
    BACKUP_FILE="$CLAUDE_CONFIG.backup.$(date +%s)"
    echo "📦 Creating backup: $BACKUP_FILE"
    cp "$CLAUDE_CONFIG" "$BACKUP_FILE"
    echo "✅ Backup created"
fi

# Create new configuration
echo ""
echo "📝 Creating new Claude configuration..."

cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "image-upload": {
      "command": "node",
      "args": ["$MCP_SERVER_PATH"],
      "env": {
        "API_BASE_URL": "$API_BASE_URL"
      }
    }
  }
}
EOF

echo "✅ Configuration created at: $CLAUDE_CONFIG"
echo ""

# Display the configuration
echo "📋 Configuration content:"
echo "------------------------"
cat "$CLAUDE_CONFIG" | jq .
echo "------------------------"
echo ""

# Instructions
echo "🚀 Next Steps:"
echo ""
echo "1️⃣  Start the REST API (required):"
echo "   cd $(dirname "$MCP_SERVER_PATH")"
echo "   npm start"
echo ""
echo "2️⃣  Restart Claude Desktop:"
echo "   - Quit Claude Desktop completely"
echo "   - Reopen Claude Desktop"
echo "   - Claude will automatically launch mcp-server.js"
echo ""
echo "3️⃣  Test in Claude:"
echo "   - Ask Claude to use the image upload tools"
echo "   - Try: 'Upload an image from URL' or 'Generate an S3 URL'"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "Configuration File: $CLAUDE_CONFIG"
echo "MCP Server: $MCP_SERVER_PATH"
echo "API Base URL: $API_BASE_URL"
echo ""

# Check if MCP server file exists
if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "⚠️  Warning: MCP server file not found at $MCP_SERVER_PATH"
    echo "Make sure mcp-server.js exists in the same directory"
fi

# Check if API is running
echo ""
echo "🔍 Checking API connectivity..."
if timeout 2 bash -c "cat </dev/null >/dev/tcp/localhost/3000" 2>/dev/null; then
    echo "✅ API is running on $API_BASE_URL"
else
    echo "⚠️  API is not running on $API_BASE_URL"
    echo "   Start it with: npm start"
fi

echo ""
echo "📚 Documentation:"
echo "   - Full setup: $CLAUDE_CONFIG_DIR/../imgs3/ARCHITECTURE.md"
echo "   - API docs: $CLAUDE_CONFIG_DIR/../imgs3/README.md"
echo "   - MCP docs: $CLAUDE_CONFIG_DIR/../imgs3/MCP_README.md"

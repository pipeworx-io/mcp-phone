# mcp-phone

Phone number validation MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1130+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `country_calling_codes` | Look up international calling (dialing) codes. With no args, lists all. Pass `query` to filter by country name, ISO code, or calling code (e.g. "germany", "DE", "49"). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "phone": {
      "url": "https://gateway.pipeworx.io/phone/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1130+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Phone data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

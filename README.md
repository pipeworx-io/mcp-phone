# mcp-phone

Phone number validation MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `validate_phone` | Validate & parse a phone number against the E.164 / ITU calling-code plan (keyless, offline). Detects the country, normalizes to E.164, and checks the national-number length is plausible. Pass an international number (e.g. "+33 1 23 45 67 89") OR a national number plus a `country` ISO code (e.g. phone="020 7946 0958", country="GB"). Does NOT determine carrier or mobile-vs-landline (that needs a keyed HLR lookup). |
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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

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

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

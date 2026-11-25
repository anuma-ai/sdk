# Release notes

## v11.4.6

[GitHub release](https://github.com/anuma-ai/sdk/releases/tag/v11.4.6)

### Integration

When a user cancels an active `client.sse.*` stream from `@anuma/sdk/client`, the
stream iterator throws `AbortError` and the client calls `onSseError` with the error.
Before v11.4.6, cancellation could end the iterator without an error.

Catch `AbortError` when you iterate the stream. Ignore `AbortError` in
`onSseError` for user cancellations to prevent an error message in the app.

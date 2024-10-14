# Nostr Chat Provider

A chat room React component that uses NOSTR protocol for messaging.

### Usage

Install the package using npm:

```bash
npm install @jinglescode/nostr-chat-plugin
```

In your `_app.tsx` file, import `NostrChatProvider` and wrap your component with it:

```typescript
import { NostrChatProvider } from "@jinglescode/nostr-chat-plugin";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NostrChatProvider>
      <Component {...pageProps} />
    </NostrChatProvider>
  );
}
```

To use the chat component, import `useNostrChat`:

```typescript
import { useNostrChat } from "@jinglescode/nostr-chat-plugin";

const { subscribeRoom, publishMessage, messages, generateNsec, setUser } =
  useNostrChat();
```

### API

First, depending if your user has a nostr key, if not, you can generate one:

```typescript
const {
  nsec: string;
  pubkey: string;
} = generateNsec();
```

For users that already have a nostr key, you can set it:

```typescript
setUser({
  nsec: nsec,
  pubkey: pubkey,
});
```

Then, when user enters a page with chat, you can subscribe to a room ID:

```typescript
subscribeRoom("room-id-here");
```

Doing so will populate and listen for new `messages` from the room.

When the connected user wants to send a message, they can publish a message to the room:

```typescript
publishMessage("message here");
```

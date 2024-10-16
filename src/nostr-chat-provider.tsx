import {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  nip19,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  Filter,
  Relay,
} from "nostr-tools";
import { Message, User } from "./types.js";

const NostrChatContext = createContext({
  subscribeRoom: async (roomId: string) => {},
  publishMessage: async (message: string) => {},
  messages: [] as Message[] | undefined,
  user: undefined as User | undefined,
  generateNsec: () => {
    return { nsec: "", pubkey: "" };
  },
  setUser: ({ nsec, pubkey }: User) => {},
  roomId: undefined as string | undefined,
  setMessages: (messages: Message[] | undefined) => {},
  setRoomId: (roomId: string | undefined) => {},
  subscribe: async (filter: Filter) => {},
});

export const NostrChatProvider = ({
  children,
  relay = "wss://relay.damus.io",
}: {
  children: ReactNode;
  relay?: string;
}) => {
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<undefined | User>(undefined);

  const getRelay = useMemo(async () => Relay.connect(relay), []);

  const subscribe = useCallback(
    async (filter: Filter) => {
      const relay = await getRelay;
      if (relay === undefined) return;
      relay.subscribe([filter], {
        onevent(event) {
          const newMessage: Message = {
            id: event.id,
            message: event.content,
            pubkey: event.pubkey,
            timestamp: event.created_at,
          };
          setMessages((prev) => [...(prev ?? []), newMessage]);
        },
      });
    },
    [getRelay, setMessages, messages]
  );

  const subscribeRoom = useCallback(
    async (_roomId: string) => {
      await subscribe({ kinds: [42], "#d": [_roomId] });
      setRoomId(_roomId);
    },
    [subscribe]
  );

  const publishMessage = useCallback(
    async (message: string) => {
      if (roomId && user) {
        const relay = await getRelay;
        if (relay === undefined) return;

        const eventTemplate = {
          kind: 42,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", roomId]],
          content: message,
        };

        const sk = resolveSk(user.nsec);
        const signedEvent = finalizeEvent(eventTemplate, sk);
        await relay.publish(signedEvent);
      }
    },
    [getRelay, roomId, user]
  );

  function generateNsec() {
    const sk = generateSecretKey();
    const nsec = nip19.nsecEncode(sk);
    const pubkey = getPublicKey(sk);
    return { nsec: nsec as string, pubkey: pubkey };
  }

  function resolveSk(nsec: string) {
    const { data } = nip19.decode(nsec);
    return data as Uint8Array;
  }

  const memoedValue = useMemo(
    () => ({
      subscribeRoom,
      publishMessage,
      messages,
      setMessages,
      user,
      setUser,
      roomId,
      setRoomId,
      generateNsec,
      subscribe,
    }),
    [
      subscribeRoom,
      publishMessage,
      messages,
      setMessages,
      user,
      setUser,
      roomId,
      setRoomId,
      generateNsec,
      subscribe,
    ]
  );

  return (
    <NostrChatContext.Provider value={memoedValue}>
      {children}
    </NostrChatContext.Provider>
  );
};

export const useNostrChat = () => {
  const context = useContext(NostrChatContext);
  if (context === undefined) {
    throw new Error("useNostrChat must be used within a NostrChatProvider");
  }
  return context;
};

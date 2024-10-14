import {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { Relay } from "nostr-tools";
import { Filter } from "nostr-tools";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { Message, User } from "./types.js";

const NostrChatContext = createContext({
  subscribeRoom: (roomId: string) => {},
  publishMessage: (message: string) => {},
  messages: [] as Message[] | undefined,
  nostrChatUser: {
    id: "",
    nsec: "",
    pubkey: "",
  } as User | undefined,
});

export const NostrChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[] | undefined>(undefined);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [nostrChatUser, setNostrChatUser] = useState<undefined | User>(
    undefined
  );

  const getRelay = useMemo(
    async () => Relay.connect("wss://relay.damus.io"),
    []
  );

  const subscribe = useCallback(
    async (filter: Filter) => {
      const relay = await getRelay;
      if (relay === undefined) return;
      relay.subscribe([filter], {
        onevent(event) {
          const newMessage = {
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
      if (roomId && nostrChatUser) {
        const relay = await getRelay;
        if (relay === undefined) return;

        const eventTemplate = {
          kind: 42,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["d", roomId]],
          content: message,
        };

        const sk = resolveSk(nostrChatUser.nsec);

        const signedEvent = finalizeEvent(eventTemplate, sk);
        await relay.publish(signedEvent);
      }
    },
    [getRelay, roomId, nostrChatUser]
  );

  function generateNsec() {
    const sk = generateSecretKey();
    const nsec = nip19.nsecEncode(sk);
    const pk = getPublicKey(sk);
    return { nsec: nsec as string, pk: pk };
  }

  function resolveSk(nsec: string): Uint8Array {
    const { data } = nip19.decode(nsec);
    return data as Uint8Array;
  }

  // useEffect(() => {
  //   if (user === undefined) return;

  //   const _user = {
  //     id: user.id,
  //     nsec: user.nostrNsec ? user.nostrNsec : "",
  //     pubkey: user.nostrPubkey ? user.nostrPubkey : "",
  //   };

  //   if (
  //     user.nostrNsec === null ||
  //     user.nostrPubkey === null ||
  //     (user.nostrNsec &&
  //       user.nostrPubkey &&
  //       user.nostrNsec.length == 0 &&
  //       user.nostrPubkey.length == 0)
  //   ) {
  //     const { nsec, pk } = generateNsec();

  //     updateUserNsec({
  //       userId: sessionData!.user.id,
  //       nsec: nsec,
  //       pubkey: pk,
  //     });

  //     _user.nsec = nsec;
  //     _user.pubkey = pk;
  //   }

  //   setNostrChatUser(_user);
  //   setUserConnected(true);
  // }, [user]);

  const memoedValue = useMemo(
    () => ({
      subscribeRoom,
      publishMessage,
      messages,
      subscribe,
      setMessages,
      nostrChatUser,
      setNostrChatUser,
      roomId,
      setRoomId,
    }),
    [
      subscribeRoom,
      publishMessage,
      messages,
      subscribe,
      setMessages,
      nostrChatUser,
      setNostrChatUser,
      roomId,
      setRoomId,
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

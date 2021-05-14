import "./App.css";
import { useEffect, useState } from "react";
import {
  Waku,
  WakuMessage,
  ChatMessage,
  StoreCodec,
  getStatusFleetNodes,
} from "js-waku";

const ChatContentTopic = "dingpu";

function App() {
  const [waku, setWaku] = useState(undefined);
  const [newMessages, setNewMessages] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handleChangeProtocols = (wakuNode, { peerId, protocols }) => {
      console.log("Protocol changed:", peerId, protocols);
      if (protocols.includes(StoreCodec)) {
        console.log(`History query to`, peerId);
        wakuNode.store.queryHistory(peerId, [ChatContentTopic]).then((res) => {
          if (res) {
            const chatMessages = res.map((wakuMsg) => {
              return ChatMessage.decode(wakuMsg.payload);
            });
            setNewMessages(chatMessages);
          }
        });
      }
    };

    if (!waku) {
      Waku.create({ config: { pubsub: { emitSelf: true } } })
        .then((wakuNode) => setWaku(wakuNode))
        .catch((e) => {
          console.error("Waku initialisation failed", e);
        });
    } else {
      // libp2p behaviour: When connected to a peer, identify protocol kicks in,
      // once complete, we know the protocol supported by the other peer
      waku.libp2p.peerStore.on(
        "change:protocols",
        handleChangeProtocols.bind({}, waku)
      );

      waku.relay.addObserver(
        (wakuMsg) => {
          const msg = ChatMessage.decode(wakuMsg.payload);
          setNewMessages([msg]);
        },
        [ChatContentTopic]
      );

      getStatusFleetNodes().then((nodes) => {
        nodes.forEach((addr) => {
          console.log(`Dialing ${addr}`);
          waku.dial(addr).then(() => console.log(`Connected to ${addr}`));
        });
      });
    }
  }, [waku]);

  if (newMessages.length !== 0) {
    const allMessages = messages.concat(newMessages);
    setMessages(allMessages);
    setNewMessages([]);
  }

  const renderedMessages = messages.map((msg) => {
    return (
      <li>
        <Message msg={msg} />
      </li>
    );
  });

  const sendMessage = async (messageToSend) => {
    const chatMessage = ChatMessage.fromUtf8String(
      new Date(),
      "demo",
      messageToSend
    );
    const wakuMessage = WakuMessage.fromBytes(
      chatMessage.encode(),
      ChatContentTopic
    );
    await waku.relay.send(wakuMessage);
  };

  return (
    <div className="App">
      <header className="App-header">
        <ChatInput sendMessage={sendMessage} />
        <ul>{renderedMessages}</ul>
      </header>
    </div>
  );
}

export default App;

function Message(props) {
  const msg = props.msg;
  const timestamp = msg.timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <div>
      ({timestamp}) {msg.nick}: {msg.payloadAsUtf8}
    </div>
  );
}

function ChatInput(props) {
  const [inputText, setInputText] = useState("");

  const onChange = (event) => {
    setInputText(event.target.value);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      props.sendMessage(inputText);
      setInputText("");
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Send a message...."
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={inputText}
      />
    </div>
  );
}

import "./App.css";
import { useEffect, useState } from "react";
import { Waku, WakuMessage, ChatMessage, getStatusFleetNodes } from "js-waku";

const ChatContentTopic = "dingpu";

function App() {
  const [waku, setWaku] = useState(undefined);
  const [newMessages, setNewMessages] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!waku) {
      Waku.create({})
        .then((wakuNode) => setWaku(wakuNode))
        .catch((e) => {
          console.error("Waku initialisation failed", e);
        });
    } else {
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

import "./App.css";
import { useEffect, useState } from "react";
import { Waku, ChatMessage, getStatusFleetNodes } from "js-waku";

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

  return (
    <div className="App">
      <header className="App-header">
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

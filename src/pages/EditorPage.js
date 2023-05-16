import React, { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import ACTIONS from "../Actions";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";

function EditorPage() {
  const render = 1;
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const navigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);

  function handleErrors(err) {
    console.log(err);
    toast.error("Socket connection failed: Try Again Later");
    navigator("/");
  }

  useEffect(() => {
    async function init() {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));
      // join
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });
      // joined
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state.username) {
            toast.success(`${username} joined the room`);
            console.log(`${username} joined the room`);
          }
          setClients([...clients]);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );
      // listening for disconnect events
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ username, socketId }) => {
        if (username !== location.state?.username) {
          toast.error(`${username} left the room`);
          console.log(`${username} left the room`);
          setClients((prev) =>
            prev.filter((client) => client.socketId !== socketId)
          );
        }
      });
    }
    if (!socketRef.current) init();

    return () => {
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.disconnect();
    };
  }, []);

  if (!location.state) {
    console.log("jjjjjj");
    return <Navigate to="/" />;
  }

  const copyRoomId = async (e) => {
    try {
      await window.navigator.clipboard.writeText(roomId);
      toast.success("Room Id has been copied to your clipboard");
    } catch (error) {
      console.log(error);
      toast.error("could not copy room Id");
    }
  };

  const leaveRoom = async (e) => {
    navigator("/");
  };

  // onCodeChange

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client?.socketId} username={client?.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => (codeRef.current = code)}
        />
      </div>
    </div>
  );
}

export default EditorPage;

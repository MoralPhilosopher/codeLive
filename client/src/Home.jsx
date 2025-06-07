import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "./Home.css";

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    const id = uuidv4();
    setRoomId(id);
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Enter a valid Room ID");
      return;
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">CodeLive</h1>
        <div className="home-input-group">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="home-input"
          />
        </div>
        <div className="home-button-group">
          <button onClick={joinRoom} className="home-button join-button">
            Join Room
          </button>
          <button onClick={createRoom} className="home-button create-button">
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}
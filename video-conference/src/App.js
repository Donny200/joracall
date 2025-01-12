import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const socket = io('http://localhost:5000'); // Укажите адрес сервера

const App = () => {
  const [page, setPage] = useState('welcome'); // 'welcome', 'join', 'room'
  const [roomId, setRoomId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const videoRefs = useRef({});
  const localVideoRef = useRef(null);

  useEffect(() => {
    // Установка локального видео потока
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Получение удалённых потоков
    remoteStreams.forEach(({ userId, stream }) => {
      if (videoRefs.current[userId] && stream) {
        videoRefs.current[userId].srcObject = stream;
      }
    });
  }, [remoteStreams]);

  useEffect(() => {
    socket.on('user-joined', ({ userId }) => {
      console.log(`User joined: ${userId}`);
    });

    socket.on('receive-stream', ({ userId, stream }) => {
      setRemoteStreams((prev) => [...prev, { userId, stream }]);
    });

    socket.on('user-left', (userId) => {
      setRemoteStreams((prev) => prev.filter((user) => user.userId !== userId));
    });

    return () => {
      socket.off('user-joined');
      socket.off('receive-stream');
      socket.off('user-left');
    };
  }, []);

  const startConference = async (isHost) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      if (isHost) {
        const newRoomId = uuidv4();
        setRoomId(newRoomId);
        socket.emit('create-room', newRoomId);
      } else {
        socket.emit('join-room', roomId);
      }

      setPage('room');
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const handleLeaveConference = () => {
    // Отключение потоков и уведомление сервера
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    socket.emit('leave-room', roomId);
    setPage('welcome');
    setRoomId('');
    setLocalStream(null);
    setRemoteStreams([]);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      startConference(false);
    }
  };

  return (
      <div className="app">
        {page === 'welcome' && (
            <div className="welcome-page">
              <h1>Welcome to Video Conference</h1>
              <button className="btn" onClick={() => startConference(true)}>Create Room</button>
              <button className="btn" onClick={() => setPage('join')}>Join Room</button>
            </div>
        )}

        {page === 'join' && (
            <div className="join-page">
              <h2>Join Room</h2>
              <form onSubmit={handleJoinRoom}>
                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <button type="submit" className="btn">Join</button>
              </form>
              <button className="btn back-btn" onClick={() => setPage('welcome')}>Back</button>
            </div>
        )}

        {page === 'room' && (
            <div className="room-page">
              <h2>Room ID: {roomId}</h2>
              <button className="btn back-btn" onClick={handleLeaveConference}>Leave</button>
              <div className="video-grid">
                <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
                {remoteStreams.map(({ userId }) => (
                    <video
                        key={userId}
                        ref={(el) => (videoRefs.current[userId] = el)}
                        autoPlay
                        playsInline
                        className="remote-video"
                    />
                ))}
              </div>
            </div>
        )}
      </div>
  );
};

export default App;

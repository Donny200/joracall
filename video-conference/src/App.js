import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

// Инициализация сокета
const socket = io('http://localhost:5000');

const App = () => {
  const [page, setPage] = useState('welcome'); // 'welcome', 'join', 'room'
  const [roomId, setRoomId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // Устанавливаем локальный видеопоток
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Обработка сокет-событий
  useEffect(() => {
    socket.on('user-joined', ({ userId }) => {
      console.log(`User joined: ${userId}`);
      if (localStream) {
        socket.emit('send-stream', { roomId, userId, stream: localStream });
      }
    });

    socket.on('receive-stream', ({ userId, stream }) => {
      if (stream instanceof MediaStream) {
        setRemoteStreams((prevStreams) => ({
          ...prevStreams,
          [userId]: stream,
        }));
      }
    });

    socket.on('user-left', (userId) => {
      setRemoteStreams((prevStreams) => {
        const updatedStreams = { ...prevStreams };
        delete updatedStreams[userId];
        return updatedStreams;
      });
    });

    return () => {
      socket.off('user-joined');
      socket.off('receive-stream');
      socket.off('user-left');
    };
  }, [localStream, roomId]);

  // Начало конференции
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

      // Отправляем свой поток при подключении
      socket.emit('send-stream', { roomId, userId: uuidv4(), stream });

      setPage('room');
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  // Присоединение к комнате
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      startConference(false);
    }
  };

  // Оставить конференцию
  const handleLeaveConference = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    socket.emit('leave-room', roomId);
    setPage('welcome');
    setRoomId('');
    setLocalStream(null);
    setRemoteStreams({});
    setScreenSharing(false);
  };

  // Демонстрация экрана
  const startScreenSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;

      // Отправляем экран
      socket.emit('share-screen', { roomId, stream: screenStream });

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };

      setScreenSharing(true);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  // Остановка демонстрации экрана
  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      socket.emit('stop-share-screen', roomId);
      setScreenSharing(false);
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
              <button className="btn" onClick={screenSharing ? stopScreenSharing : startScreenSharing}>
                {screenSharing ? 'Stop Sharing' : 'Share Screen'}
              </button>
              <div className="video-grid">
                {/* Локальное видео */}
                <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />

                {/* Демонстрация экрана */}
                {screenSharing && (
                    <video
                        ref={(el) => {
                          if (el && screenStreamRef.current) {
                            el.srcObject = screenStreamRef.current;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="screen-video"
                    />
                )}

                {/* Видео других участников */}
                {Object.keys(remoteStreams).map((userId) => (
                    <video
                        key={userId}
                        ref={(el) => (remoteVideoRefs.current[userId] = el)}
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

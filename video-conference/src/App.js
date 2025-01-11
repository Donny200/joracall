import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import Participant from './Participant';

const socket = io.connect('http://localhost:3000');

const App = () => {
  const [localStream, setLocalStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [roomId, setRoomId] = useState(null);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conferenceEnded, setConferenceEnded] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conferenceLink, setConferenceLink] = useState('');
  const userVideoRef = useRef();

  useEffect(() => {
    const roomFromUrl = window.location.pathname.split('/')[2];
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      setIsCreator(false);
      joinRoom(roomFromUrl);
    }

    socket.on('new-user', (userId) => {
      if (!usersInRoom.includes(userId)) {
        setUsersInRoom((prevUsers) => [...prevUsers, userId]);
        callUser(userId);
      }
    });

    socket.on('offer', (offer, userId) => {
      handleOffer(offer, userId);
    });

    socket.on('answer', (answer, userId) => {
      handleAnswer(answer, userId);
    });

    socket.on('ice-candidate', (candidate, userId) => {
      handleIceCandidate(candidate, userId);
    });

    socket.on('end-conference', () => {
      setConferenceEnded(true);
    });

    socket.on('user-left', () => {
      setConferenceEnded(true);
    });

    socket.on('chat-message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off('new-user');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('end-conference');
      socket.off('user-left');
      socket.off('chat-message');
    };
  }, [localStream, usersInRoom]);

  const startConference = () => {
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          userVideoRef.current.srcObject = stream;
          const room = generateRoomId();
          setRoomId(room);
          setIsCreator(true);
          socket.emit('join', { room });

          setConferenceLink(`http://localhost:3000/room/${room}`);
        })
        .catch((err) => console.error('Не удалось получить доступ к камере или микрофону: ', err));
  };

  const generateRoomId = () => {
    return 'room-' + Math.random().toString(36).substring(7);
  };

  const joinRoom = (roomId) => {
    socket.emit('join', { room: roomId });
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          userVideoRef.current.srcObject = stream;
        })
        .catch((err) => console.error('Не удалось получить доступ к камере или микрофону: ', err));
  };

  const callUser = (userId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.addStream(localStream);
    setPeerConnections((prev) => ({ ...prev, [userId]: peerConnection }));

    peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit('offer', { offer: peerConnection.localDescription, userId });
        })
        .catch((err) => console.error('Не удалось создать предложение: ', err));
  };

  const handleOffer = (offer, userId) => {
    const peerConnection = new RTCPeerConnection();
    peerConnection.addStream(localStream);
    setPeerConnections((prev) => ({ ...prev, [userId]: peerConnection }));

    peerConnection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then((answer) => peerConnection.setLocalDescription(answer))
        .then(() => {
          socket.emit('answer', { answer: peerConnection.localDescription, userId });
        })
        .catch((err) => console.error('Не удалось обработать предложение: ', err));
  };

  const handleAnswer = (answer, userId) => {
    const peerConnection = peerConnections[userId];
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = (candidate, userId) => {
    const peerConnection = peerConnections[userId];
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const handleExit = () => {
    socket.emit('user-left', roomId);
    localStream.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setPeerConnections({});
    setUsersInRoom([]);
    setRoomId(null);
    setConferenceEnded(true);
  };

  const handleEndConference = () => {
    socket.emit('end-conference', roomId);
    setConferenceEnded(true);
  };

  const muteUnmute = () => {
    localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
    setIsMuted(!isMuted);
  };

  const sendMessage = (messageText) => {
    socket.emit('chat-message', { text: messageText });
  };

  return (
      <div className={`App ${isCreator ? 'creator' : 'participant'}`}>
        {conferenceEnded && <h2>Конференция завершена</h2>}
        {!conferenceEnded && (
            <div className="user-video-container">
              <h3>Ваше видео</h3>
              <div className="video-wrapper">
                <video ref={userVideoRef} autoPlay muted />
              </div>
            </div>
        )}

        <div className="video-grid">
          {usersInRoom.map((userId) => (
              <Participant key={userId} userId={userId} peerConnection={peerConnections[userId]} />
          ))}
        </div>

        {conferenceLink && !conferenceEnded && (
            <div>
              <p>Ссылка на конференцию: <a href={conferenceLink} target="_blank" rel="noopener noreferrer">{conferenceLink}</a></p>
            </div>
        )}
        {!roomId && !conferenceEnded && !isCreator && <button className="start-conference" onClick={startConference}>Начать конференцию</button>}
        {isCreator && !conferenceEnded && <button className="end-conference" onClick={handleEndConference}>Завершить конференцию</button>}
        {roomId && !conferenceEnded && <button onClick={handleExit}>Выйти</button>}
        {roomId && !conferenceEnded && <button onClick={muteUnmute}>{isMuted ? 'Unmute' : 'Mute'}</button>}
      </div>
  );
};

export default App;
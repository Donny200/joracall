import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Adjust the URL as needed

const VideoConferenceApp = () => {
    const [roomId, setRoomId] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [waitingRoom, setWaitingRoom] = useState([]);
    const [messages, setMessages] = useState([]);
    const videoRef = useRef(null);
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        socket.on('new-user', (userId) => {
            setParticipants((prev) => [...prev, userId]);
        });

        socket.on('chat-message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socket.on('user-left', (userId) => {
            setParticipants((prev) => prev.filter((id) => id !== userId));
        });

        return () => {
            socket.off('new-user');
            socket.off('chat-message');
            socket.off('user-left');
        };
    }, []);

    const startVideo = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        videoRef.current.srcObject = stream;
        socket.emit('join-room', roomId);
    };

    const sendMessage = (text) => {
        socket.emit('chat-message', { text, userId: socket.id });
    };

    const admitUser = (userId) => {
        socket.emit('admit-user', userId);
        setWaitingRoom((prev) => prev.filter((id) => id !== userId));
    };

    const startScreenShare = async () => {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getTracks()[0];
        localStream.getVideoTracks()[0].stop(); // Stop the current video track
        localStream.addTrack(screenTrack); // Add the screen track
        screenTrack.onended = async () => {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.addTrack(cameraStream.getVideoTracks()[0]);
        };
    };

    const muteUser = (userId) => {
        socket.emit('mute-user', userId);
    };

    const removeUser = (userId) => {
        socket.emit('remove-user', userId);
    };

    return (
        <div>
            <h1>Video Conference Room</h1>
            <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={startVideo}>Join Room</button>
            <video ref={videoRef} autoPlay playsInline />

            <div>
                <h2>Chat</h2>
                <div>
                    {messages.map((msg, index) => (
                        <div key={index}>{msg.text}</div>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Type a message"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            sendMessage(e.target.value);
                            e.target.value = '';
                        }
                    }}
                />
            </div>

            <div>
                <h2>Participants</h2>
                {participants.map((participant) => (
                    <div key={participant}>
                        {participant}
                        <button onClick={() => muteUser(participant)}>Mute</button>
                        <button onClick={() => removeUser(participant)}>Remove</button>
                    </div>
                ))}
            </div>

            <button onClick={startScreenShare}>Share Screen</button>
        </div>
    );
};

export default VideoConferenceApp;
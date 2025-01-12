import React, { useState, useRef, useEffect } from 'react';

const VideoConference = () => {
    const [roomId] = useState('65ea16af-8d7a-4e2f-8217-bab4b166460c');
    const [cameraStream, setCameraStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);

    const cameraVideoRef = useRef(null);
    const screenVideoRef = useRef(null);

    useEffect(() => {
        // Запуск камеры
        startCamera();

        return () => {
            stopCamera();
            stopScreenSharing();
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setCameraStream(stream);
            if (cameraVideoRef.current) {
                cameraVideoRef.current.srcObject = stream;
            }
            console.log('Camera started successfully.');
        } catch (error) {
            console.error('Error starting camera:', error);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
            console.log('Camera stopped.');
        }
    };

    const startScreenSharing = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setScreenStream(stream);

            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = stream;
            }

            // Обработка завершения демонстрации
            stream.getVideoTracks()[0].onended = () => {
                stopScreenSharing();
                console.log('Screen sharing stopped by user.');
            };

            console.log('Screen sharing started successfully.');
        } catch (error) {
            console.error('Error starting screen sharing:', error);
        }
    };

    const stopScreenSharing = () => {
        if (screenStream) {
            screenStream.getTracks().forEach((track) => track.stop());
            setScreenStream(null);
            console.log('Screen sharing stopped.');
        }
    };

    const leaveRoom = () => {
        stopCamera();
        stopScreenSharing();
        alert('You have left the room.');
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e293b', color: '#ffffff', borderRadius: '8px' }}>
            <h2>Room ID: {roomId}</h2>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <button
                    onClick={leaveRoom}
                    style={{
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    Leave
                </button>
                {screenStream ? (
                    <button
                        onClick={stopScreenSharing}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Stop Sharing
                    </button>
                ) : (
                    <button
                        onClick={startScreenSharing}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                    >
                        Share Screen
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                    <h3>Camera</h3>
                    <video
                        ref={cameraVideoRef}
                        autoPlay
                        playsInline
                        style={{ width: '300px', height: '200px', border: '1px solid #ccc', borderRadius: '8px' }}
                    ></video>
                </div>
                <div>
                    <h3>Screen Sharing</h3>
                    {screenStream ? (
                        <video
                            ref={screenVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: '300px', height: '200px', border: '1px solid #ccc', borderRadius: '8px' }}
                        ></video>
                    ) : (
                        <p style={{ color: '#ccc' }}>No screen sharing</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoConference;

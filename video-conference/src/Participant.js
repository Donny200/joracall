import React, { useEffect, useRef } from 'react';

const Participant = ({ userId, peerConnection }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && !videoRef.current.srcObject) {
            peerConnection.ontrack = (event) => {
                videoRef.current.srcObject = event.streams[0];
            };
        }
    }, [peerConnection]);

    return (
        <div className="participant-container">
            <h3>Пользователь: {userId}</h3>
            <div className="video-wrapper">
                <video
                    id={`video-${userId}`}
                    autoPlay
                    ref={videoRef}
                />
            </div>
        </div>
    );
};

export default Participant;

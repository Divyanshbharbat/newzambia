import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
        { role: 'bot', text: 'Hello! I am your School Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(`http://${window.location.hostname}:5000/api/chat`, { message: userMessage });
            setMessages(prev => [...prev, { role: 'bot', text: response.data.response }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error. Please make sure Ollama is running.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            {!isOpen && (
                <button className="chatbot-toggle" onClick={() => setIsOpen(true)}>
                    <span className="chat-icon">💬</span>
                    <span className="chat-text">Ask Assistant</span>
                </button>
            )}

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>School Assistant</h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}`}>
                                <div className="message-bubble">{msg.text}</div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message bot">
                                <div className="message-bubble loading">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="chatbot-input">
                        <input
                            type="text"
                            placeholder="Ask about fees, students, hostel..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} disabled={isLoading}>Send</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;

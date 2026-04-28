import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSend, FiImage, FiLoader } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './ChatWindow.css';

const ChatWindow = ({ chatId, course, recipient, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUserId = String(user?.id || user?._id || '');

  const isOwnMessage = (msg) => String(msg?.sender?._id || msg?.sender || '') === currentUserId;

  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    return imageUrl;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/chat/${chatId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/auth/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.url;
    } catch (err) {
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;

    setSending(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl && !newMessage.trim()) {
          setSending(false);
          return;
        }
      }

      const res = await api.post('/chat/message/send', {
        chatId,
        content: newMessage.trim(),
        imageUrl
      });

      setMessages([...messages, res.data.data]);
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const removeImagePreview = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="chat-window-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="chat-window"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <h3>{recipient.name}</h3>
              <p>{course.name} • {course.code}</p>
            </div>
            <button className="chat-close-btn" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {loading && messages.length === 0 ? (
              <div className="chat-loading">
                <FiLoader className="spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg._id}
                  className={`chat-message ${isOwnMessage(msg) ? 'sent' : 'received'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="message-content">
                    {msg.messageType === 'image' || msg.messageType === 'text-image' ? (
                      <a
                        href={resolveImageUrl(msg.imageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="message-image-link"
                        title="Open image"
                      >
                        <img src={resolveImageUrl(msg.imageUrl)} alt="chat image" className="message-image" />
                      </a>
                    ) : null}
                    {msg.content && (
                      <p className="message-text">{msg.content}</p>
                    )}
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="chat-image-preview">
              <img src={imagePreview} alt="preview" />
              <button className="remove-preview-btn" onClick={removeImagePreview}>
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Input */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="chat-image-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Attach image"
            >
              <FiImage size={18} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
              disabled={sending}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={sending || (!newMessage.trim() && !selectedImage)}
            >
              {sending ? <FiLoader className="spin" size={18} /> : <FiSend size={18} />}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatWindow;

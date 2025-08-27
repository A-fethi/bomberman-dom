import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';
import { webSocketManager } from '../WebSocketManager.js';

let messageValue = '';
// Chat component with WebSocket integration
export function Chat() {
    const gameState = getGameState();
    let inputRef = null;
    let messagesRef = null;

    const scrollToBottom = () => {
        if (messagesRef) {
            messagesRef.scrollTop = messagesRef.scrollHeight;
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();

        const trimmedMessage = messageValue.trim();
        if (!trimmedMessage) return;

        // Use WebSocket to send chat message
        webSocketManager.sendChatMessage(trimmedMessage);

        // Add local message immediately for instant feedback
        const newMessage = {
            id: Date.now(),
            player: gameState.nickname,
            message: trimmedMessage,
            timestamp: new Date().toLocaleTimeString(),
            isLocal: true
        };

        updateGameState({
            ...getGameState(),
            chatMessages: [...gameState.chatMessages, newMessage]
        });

        // Clear the input field
        messageValue = '';
        if (inputRef) {
            inputRef.value = '';
        }
        setTimeout(scrollToBottom, 0);
    };

    setTimeout(scrollToBottom, 0);
    return Vnode('div', { class: 'chat-container' }, [
        Vnode('div', { class: 'chat-messages' }, [
            Vnode('h3', {}, 'Chat'),
            Vnode('div', { class: 'messages-list', ref: (el) => { messagesRef = el; } }, [
                ...gameState.chatMessages.map(msg =>
                    Vnode('div', {
                        class: `message ${msg.isLocal ? 'local' : 'remote'}`
                    }, [
                        Vnode('span', { class: 'message-time' }, msg.timestamp),
                        Vnode('span', { class: 'message-player' }, msg.player),
                        Vnode('span', { class: 'message-text' }, msg.message)
                    ])
                )
            ])
        ]),
        Vnode('form', { class: 'chat-input-form', onsubmit: sendMessage }, [
            Vnode('input', {
                key: 'chat-input',
                ref: (el) => {
                    inputRef = el;
                    if (el && el.value !== messageValue) {
                        el.value = messageValue;
                    }
                },
                type: 'text',
                placeholder: 'Type a message...',
                oninput: (e) => {
                    messageValue = e.target.value;
                },
                onfocus: () => { window.isChatInputFocused = true; },
                onblur: () => { window.isChatInputFocused = false; },
                class: 'chat-input',
                maxlength: 100
            }),
            Vnode('button', { type: 'submit', class: 'send-btn' }, 'Send')
        ])
    ]);
} 
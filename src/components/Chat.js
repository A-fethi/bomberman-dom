import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';
import { webSocketManager } from '../WebSocketManager.js';

let messageValue = '';
// Phase 3: Chat component with WebSocket integration
export function Chat() {
    const gameState = getGameState();
    let inputRef = null;
    
    const sendMessage = (e) => {
        e.preventDefault();
        
        const trimmedMessage = messageValue.trim();
        if (!trimmedMessage) return;
        
        // Phase 3: Use WebSocket to send chat message
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
    };
    
    return Vnode('div', { class: 'chat-container' }, [
        Vnode('div', { class: 'chat-messages' }, [
            Vnode('h3', {}, 'Chat'),
            Vnode('div', { class: 'messages-list' }, [
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
                class: 'chat-input',
                maxlength: 100
            }),
            Vnode('button', { type: 'submit', class: 'send-btn' }, 'Send')
        ])
    ]);
} 
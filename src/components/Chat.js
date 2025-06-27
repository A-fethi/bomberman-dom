import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, setGameState } from '../GameApp.js';

// Phase 2: Chat component (preparing for Phase 7)
export function Chat() {
    const gameState = getGameState();
    let messageValue = '';
    
    const sendMessage = (e) => {
        e.preventDefault();
        
        const trimmedMessage = messageValue.trim();
        if (!trimmedMessage) return;
        
        const newMessage = {
            id: Date.now(),
            player: gameState.nickname,
            message: trimmedMessage,
            timestamp: new Date().toLocaleTimeString(),
            isLocal: true
        };
        
        setGameState({
            ...getGameState(),
            chatMessages: [...gameState.chatMessages, newMessage]
        });
        
        messageValue = '';
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
import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, setGameState } from '../GameApp.js';

// Phase 2: NicknameEntry component
export function NicknameEntry() {
    let nicknameValue = '';
    let errorMessage = '';
    
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const trimmedNickname = nicknameValue.trim();
        
        if (!trimmedNickname) {
            errorMessage = 'Please enter a nickname';
            setGameState({ ...getGameState() });
            return;
        }
        
        if (trimmedNickname.length < 2) {
            errorMessage = 'Nickname must be at least 2 characters long';
            setGameState({ ...getGameState() });
            return;
        }
        
        if (trimmedNickname.length > 15) {
            errorMessage = 'Nickname must be less than 15 characters';
            setGameState({ ...getGameState() });
            return;
        }
        
        // Phase 2: Set nickname and transition to waiting room
        setGameState({
            ...getGameState(),
            currentScreen: 'waiting',
            nickname: trimmedNickname,
            roomId: null, // Will be assigned when joining a room
            players: [{ id: 'local', nickname: trimmedNickname, isLocal: true }]
        });
    };
    
    return Vnode('div', { class: 'nickname-entry' }, [
        Vnode('div', { class: 'nickname-form' }, [
            Vnode('h2', {}, 'Enter Your Nickname'),
            Vnode('form', { onsubmit: handleSubmit }, [
                Vnode('input', {
                    type: 'text',
                    placeholder: 'Enter nickname (2-15 characters)',
                    oninput: (e) => {
                        nicknameValue = e.target.value;
                        errorMessage = '';
                    },
                    maxlength: 15,
                    autocomplete: 'off',
                    class: 'nickname-input'
                }),
                errorMessage && Vnode('div', { class: 'error-message' }, errorMessage),
                Vnode('button', { type: 'submit', class: 'submit-btn' }, 'Join Game')
            ])
        ])
    ]);
} 
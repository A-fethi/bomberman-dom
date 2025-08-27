import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';
import { webSocketManager } from '../WebSocketManager.js';

// NicknameEntry component with all4one-js
export function NicknameEntry() {
    const { nicknameInput, nicknameError } = getGameState();

    let inputRef = null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedNickname = nicknameInput.trim();

        if (!trimmedNickname) {
            updateGameState({ nicknameError: 'Please enter a nickname' });
            return;
        }
        if (trimmedNickname.length < 2) {
            updateGameState({ nicknameError: 'Nickname must be at least 2 characters long' });
            return;
        }
        if (trimmedNickname.length > 15) {
            updateGameState({ nicknameError: 'Nickname must be less than 15 characters' });
            return;
        }

        updateGameState({
            nickname: trimmedNickname,
            nicknameInput: '',
            nicknameError: ''
        });
        webSocketManager.sendJoinGame(trimmedNickname);
    };

    const result = Vnode('div', { class: 'nickname-entry' }, [
        Vnode('div', { class: 'nickname-form' }, [
            Vnode('h2', {}, 'Enter Your Nickname'),
            Vnode('form', { onsubmit: handleSubmit }, [
                Vnode('input', {
                    key: 'nickname-input',
                    ref: (el) => {
                        inputRef = el;
                        if (el && el.value !== nicknameInput) {
                            el.value = nicknameInput;
                        }
                    },
                    type: 'text',
                    placeholder: 'Enter nickname (2-15 characters)',
                    oninput: (e) => {
                        updateGameState({ nicknameInput: e.target.value, nicknameError: '' });
                    },
                    maxlength: 15,
                    autocomplete: 'off',
                    class: 'nickname-input'
                }),
                nicknameError && Vnode('div', { class: 'error-message' }, nicknameError),
                Vnode('button', { type: 'submit', class: 'submit-btn' }, 'Join Game')
            ])
        ])
    ]);
    return result;
} 
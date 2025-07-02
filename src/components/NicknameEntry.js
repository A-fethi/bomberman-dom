import { Vnode } from '../../node_modules/all4one-js/index.js';
import { getGameState, updateGameState } from '../GameApp.js';
import { webSocketManager } from '../WebSocketManager.js';

// Phase 2: NicknameEntry component with all4one-js
export function NicknameEntry() {
    console.log('📝 NicknameEntry: Function called...');
    const { nicknameInput, nicknameError } = getGameState();
    console.log('📊 NicknameEntry: Got state - input:', nicknameInput, 'error:', nicknameError);

    let inputRef = null;

    const handleSubmit = (e) => {
        console.log('📝 NicknameEntry: Form submitted...');
        e.preventDefault();
        const trimmedNickname = nicknameInput.trim();
        console.log('📝 NicknameEntry: Trimmed nickname:', trimmedNickname);

        if (!trimmedNickname) {
            console.log('❌ NicknameEntry: Empty nickname error');
            updateGameState({ nicknameError: 'Please enter a nickname' });
            return;
        }
        if (trimmedNickname.length < 2) {
            console.log('❌ NicknameEntry: Nickname too short error');
            updateGameState({ nicknameError: 'Nickname must be at least 2 characters long' });
            return;
        }
        if (trimmedNickname.length > 15) {
            console.log('❌ NicknameEntry: Nickname too long error');
            updateGameState({ nicknameError: 'Nickname must be less than 15 characters' });
            return;
        }

        console.log('✅ NicknameEntry: Valid nickname, updating state...');
        updateGameState({
            nickname: trimmedNickname,
            nicknameInput: '',
            nicknameError: ''
        });
        console.log('🔌 NicknameEntry: Calling webSocketManager.sendJoinGame...');
        webSocketManager.sendJoinGame(trimmedNickname);
    };

    console.log('🎨 NicknameEntry: Building Vnode...');
    const result = Vnode('div', { class: 'nickname-entry' }, [
        Vnode('div', { class: 'nickname-form' }, [
            Vnode('h2', {}, 'Enter Your Nickname'),
            Vnode('form', { onsubmit: handleSubmit }, [
                Vnode('input', {
                    key: 'nickname-input',
                    ref: (el) => {
                        inputRef = el;
                        if (el && el.value !== nicknameInput) {
                            console.log('🔧 NicknameEntry: Setting input value to:', nicknameInput);
                            el.value = nicknameInput;
                        }
                    },
                    type: 'text',
                    placeholder: 'Enter nickname (2-15 characters)',
                    oninput: (e) => {
                        console.log('📝 NicknameEntry: Input changed to:', e.target.value);
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
    console.log('✅ NicknameEntry: Vnode built successfully');
    return result;
} 
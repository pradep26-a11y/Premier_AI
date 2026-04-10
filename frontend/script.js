/**
 * Premier Academy Encyclopedia AI - Logic Engine v2.0
 * Hand-crafted with premium transitions and modern state management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        isAdmin: false,
        isHybrid: false,
        selectedMode: 'fast',
        currentAttachment: null,
        isThinking: false,
        currentView: 'view-chat'
    };

    // --- DOM Elements ---
    const dom = {
        chatBox: document.getElementById('chat-box'),
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        navItems: {
            chat: document.getElementById('nav-chat'),
            ingest: document.getElementById('nav-ingest'),
            export: document.getElementById('nav-export')
        },
        views: {
            chat: document.getElementById('view-chat'),
            ingest: document.getElementById('view-ingest')
        },
        status: {
            indicator: document.getElementById('engine-status-bol'),
            text: document.getElementById('engine-status-text'),
            turbo: document.getElementById('turbo-badge')
        },
        admin: {
            trigger: document.getElementById('admin-login-trigger'),
            label: document.getElementById('user-role-label'),
            only: document.querySelectorAll('.admin-only')
        },
        attachments: {
            container: document.getElementById('attachment-preview-container'),
            trigger: document.getElementById('ctx-media'),
            input: document.getElementById('media-capture')
        },
        upload: {
            zone: document.getElementById('upload-zone'),
            status: document.getElementById('upload-status'),
            text: document.getElementById('status-text'),
            fileInput: document.getElementById('file-input')
        }
    };

    // --- Core Functionality ---

    /**
     * Fetch System Configuration
     */
    async function initSystem() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            state.isHybrid = data.is_hybrid;
            
            updateSystemStatusUI();
        } catch (e) {
            console.error("System sync failed", e);
            dom.status.text.innerText = "Offline Mode";
            dom.status.indicator.style.background = "var(--danger)";
        }
    }

    function updateSystemStatusUI() {
        if (state.isHybrid) {
            dom.status.turbo.classList.remove('hidden-view');
            dom.status.text.innerText = "Cloud Engine Active";
            dom.status.indicator.style.background = "var(--success)";
            dom.status.indicator.style.boxShadow = "0 0 12px var(--success)";
        } else {
            dom.status.turbo.classList.add('hidden-view');
            dom.status.text.innerText = "Local Engine Active";
            dom.status.indicator.style.background = "var(--sh-blue)";
            dom.status.indicator.style.boxShadow = "0 0 12px var(--sh-blue)";
        }
    }

    /**
     * View Navigation
     */
    function switchView(viewKey) {
        // Update Nav UI
        Object.keys(dom.navItems).forEach(key => {
            dom.navItems[key]?.classList.toggle('active', key === viewKey);
        });

        // Update View Visibility
        Object.keys(dom.views).forEach(key => {
            if (key === viewKey) {
                dom.views[key].classList.remove('hidden-view');
                dom.views[key].style.animation = 'slideUp 0.5s ease forwards';
            } else {
                dom.views[key].classList.add('hidden-view');
            }
        });

        state.currentView = `view-${viewKey}`;
    }

    dom.navItems.chat.addEventListener('click', () => switchView('chat'));
    dom.navItems.ingest.addEventListener('click', () => switchView('ingest'));
    dom.navItems.export.addEventListener('click', () => {
        showSystemMessage("Export Assets is currently in Alpha. Soon you'll be able to generate interactive study guides.");
    });

    /**
     * Mode Selection Logic
     */
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            state.selectedMode = radio.value;
        });
    });

    /**
     * Auto-resizing Textarea
     */
    dom.userInput.addEventListener('input', () => {
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = (dom.userInput.scrollHeight) + 'px';
    });

    /**
     * Media Handling
     */
    dom.attachments.trigger.addEventListener('click', () => dom.attachments.input.click());

    dom.attachments.input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                state.currentAttachment = event.target.result;
                renderAttachmentPreview();
            };
            reader.readAsDataURL(file);
        }
    });

    function renderAttachmentPreview() {
        dom.attachments.container.innerHTML = `
            <div class="preview-card" style="position: relative; width: 80px; height: 80px; border-radius: 12px; overflow: hidden; border: 2px solid var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-bottom: 5px;">
                <img src="${state.currentAttachment}" style="width: 100%; height: 100%; object-fit: cover;">
                <button id="remove-attachment" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">×</button>
            </div>
        `;
        dom.attachments.container.classList.remove('hidden-view');
        document.getElementById('remove-attachment').onclick = clearAttachment;
    }

    function clearAttachment() {
        state.currentAttachment = null;
        dom.attachments.container.classList.add('hidden-view');
        dom.attachments.container.innerHTML = '';
        dom.attachments.input.value = '';
    }

    /**
     * Admin Control
     */
    dom.admin.trigger.addEventListener('click', () => {
        if (state.isAdmin) {
            if (confirm("Sign out of Researcher Dashboard?")) {
                state.isAdmin = false;
                dom.admin.label.innerText = "Student";
                dom.admin.only.forEach(el => el.classList.add('hidden-view'));
                switchView('chat');
            }
            return;
        }

        const pwd = prompt("Enter Investigator credentials:");
        if (pwd === "admin123") {
            state.isAdmin = true;
            dom.admin.label.innerText = "Investigator";
            dom.admin.only.forEach(el => el.classList.remove('hidden-view'));
            showSystemMessage("Researcher Access Granted. Knowledge Ingestion tools unlocked.");
        }
    });

    /**
     * Communication Engine
     */
    async function sendMessage() {
        const text = dom.userInput.value.trim();
        if (!text || state.isThinking) return;

        const attachmentClone = state.currentAttachment;
        appendMessage('user', text, false, attachmentClone);
        
        dom.userInput.value = '';
        dom.userInput.style.height = 'auto';
        clearAttachment();

        state.isThinking = true;
        const thinkingItem = appendMessage('system', '', true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    mode: state.selectedMode,
                    image: attachmentClone
                })
            });

            const data = await response.json();
            thinkingItem.remove();
            state.isThinking = false;

            if (response.ok) {
                await typewriterEffect(data.response);
            } else {
                appendMessage('system', `Error: ${data.detail || 'Critical failure in computation unit.'}`);
            }
        } catch (error) {
            thinkingItem.remove();
            state.isThinking = false;
            appendMessage('system', "Network Interruption: Could not stabilize connection to Research Engine.");
        }
    }

    function appendMessage(sender, text, isThinking = false, image = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const avatarSvg = sender === 'user' 
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';

        const imageHtml = image ? `<img src="${image}" style="max-width: 200px; border-radius: 12px; margin-bottom: 8px; display: block;">` : '';
        
        msgDiv.innerHTML = `
            <div class="avatar">${avatarSvg}</div>
            <div class="bubble">
                ${imageHtml}
                <div class="text-content">${isThinking ? '<div class="dots"><div></div><div></div><div></div></div>' : formatText(text)}</div>
            </div>
        `;

        dom.chatBox.appendChild(msgDiv);
        dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
        return msgDiv;
    }

    async function typewriterEffect(text) {
        const msgDiv = appendMessage('system', '');
        const textTarget = msgDiv.querySelector('.text-content');
        
        // Simple word-by-word streaming simulation for premium feel
        const words = text.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
            currentText += words[i] + ' ';
            textTarget.innerHTML = formatText(currentText);
            dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
            await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
        }
    }

    function formatText(text) {
        if(!text) return "";
        let formatted = text
            .replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]))
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        return formatted;
    }

    function showSystemMessage(msg) {
        const sysMsg = document.createElement('div');
        sysMsg.style = "text-align: center; font-size: 0.8rem; color: var(--text-dim); margin: 10px 0; font-style: italic;";
        sysMsg.innerText = msg;
        dom.chatBox.appendChild(sysMsg);
        dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
    }

    /**
     * Ingestion Controller
     */
    async function handleFileUpload(file) {
        if(!file.filename && file.type !== "application/pdf") {
            alert("Scientific data must be in PDF format.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        dom.upload.zone.style.display = 'none';
        dom.upload.status.style.display = 'block';
        dom.upload.text.innerText = `Ingesting ${file.name}...`;

        try {
            const response = await fetch('/api/ingest', { method: 'POST', body: formData });
            const result = await response.json();
            
            if(response.ok) {
                dom.upload.text.innerText = result.message;
                pollIngestionProgress();
            } else {
                throw new Error(result.detail);
            }
        } catch (err) {
            dom.upload.text.innerText = `Error: ${err.message}`;
            dom.upload.text.style.color = "var(--danger)";
            setTimeout(() => resetUploadUI(), 5000);
        }
    }

    function pollIngestionProgress() {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                dom.upload.text.innerText = data.status_message;
                
                if (!data.is_processing) {
                    clearInterval(interval);
                    dom.upload.text.style.color = data.status_message.includes("Success") ? "var(--success)" : "var(--danger)";
                    setTimeout(() => resetUploadUI(), 5000);
                }
            } catch (e) { console.error("Polling error", e); }
        }, 2000);
    }

    function resetUploadUI() {
        dom.upload.zone.style.display = 'flex';
        dom.upload.status.style.display = 'none';
        dom.upload.text.style.color = "var(--text-muted)";
        dom.upload.text.innerText = "Introspecting PDF content...";
        dom.upload.fileInput.value = '';
    }

    // --- Event Listeners ---
    dom.sendBtn.addEventListener('click', sendMessage);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    dom.upload.fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });

    // --- Startup ---
    initSystem();
});


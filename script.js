/**
 * Quill Notes - Professional Minimalist Notebook
 */

class QuillNotes {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('quill_notes_v2')) || [];
        this.currentNoteId = null;
        this.selectedTag = null;
        this.searchQuery = '';
        this.saveTimer = null;

        this.cacheDOM();
        this.bindEvents();
        this.render();
    }

    cacheDOM() {
        this.dom = {
            notesList: document.getElementById('notes-list'),
            tagsList: document.getElementById('tags-list'),
            searchInput: document.getElementById('search'),
            addBtn: document.getElementById('add-note'),
            startBtn: document.getElementById('start-btn'),
            deleteBtn: document.getElementById('delete-btn'),
            emptyState: document.getElementById('empty-state'),
            editorView: document.getElementById('editor-view'),
            titleField: document.getElementById('note-title'),
            bodyField: document.getElementById('note-body'),
            tagsInput: document.getElementById('note-tags'),
            currentTags: document.getElementById('current-tags'),
            saveIndicator: document.getElementById('save-indicator'),
            stats: document.getElementById('stats')
        };
    }

    bindEvents() {
        this.dom.addBtn.addEventListener('click', () => this.createNote());
        this.dom.startBtn.addEventListener('click', () => this.createNote());
        this.dom.deleteBtn.addEventListener('click', () => this.deleteCurrentNote());

        this.dom.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderNotesList();
        });

        const handleInput = () => {
            this.showSaving();
            clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.saveNote(), 1000);
        };

        this.dom.titleField.addEventListener('input', handleInput);
        this.dom.bodyField.addEventListener('input', handleInput);

        this.dom.tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.addTag(e.target.value.trim());
                e.target.value = '';
                handleInput();
            }
        });
    }

    // --- Logic ---

    createNote() {
        const newNote = {
            id: Date.now().toString(),
            title: '',
            content: '',
            tags: [],
            updatedAt: new Date().toISOString()
        };
        this.notes.unshift(newNote);
        this.saveToStorage();
        this.openNote(newNote.id);
        this.render();
        this.dom.titleField.focus();
    }

    openNote(id) {
        this.currentNoteId = id;
        const note = this.notes.find(n => n.id === id);
        if (note) {
            this.dom.emptyState.classList.add('hidden');
            this.dom.editorView.classList.remove('hidden');
            this.dom.titleField.value = note.title;
            this.dom.bodyField.value = note.content;
            this.renderCurrentNoteTags(note);
            this.dom.saveIndicator.textContent = '保存済み';
            this.renderNotesList();
        }
    }

    saveNote() {
        if (!this.currentNoteId) return;
        const index = this.notes.findIndex(n => n.id === this.currentNoteId);
        if (index === -1) return;

        this.notes[index].title = this.dom.titleField.value;
        this.notes[index].content = this.dom.bodyField.value;
        this.notes[index].updatedAt = new Date().toISOString();

        // Move to top
        const [note] = this.notes.splice(index, 1);
        this.notes.unshift(note);

        this.saveToStorage();
        this.renderNotesList();
        this.dom.saveIndicator.textContent = '保存済み';
    }

    deleteCurrentNote() {
        if (!confirm('このノートを削除しますか？')) return;
        this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
        this.currentNoteId = null;
        this.saveToStorage();
        this.render();
        
        this.dom.editorView.classList.add('hidden');
        this.dom.emptyState.classList.remove('hidden');
    }

    addTag(tag) {
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (note && !note.tags.includes(tag)) {
            note.tags.push(tag);
            this.renderCurrentNoteTags(note);
            this.renderTagsList();
        }
    }

    removeTag(tag) {
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (note) {
            note.tags = note.tags.filter(t => t !== tag);
            this.renderCurrentNoteTags(note);
            this.renderTagsList();
            this.saveNote();
        }
    }

    // --- Rendering ---

    render() {
        this.renderNotesList();
        this.renderTagsList();
        this.dom.stats.textContent = `${this.notes.length} ノート`;
    }

    renderNotesList() {
        let filtered = this.notes;

        if (this.selectedTag) {
            filtered = filtered.filter(n => n.tags.includes(this.selectedTag));
        }

        if (this.searchQuery) {
            filtered = filtered.filter(n => 
                n.title.toLowerCase().includes(this.searchQuery) || 
                n.content.toLowerCase().includes(this.searchQuery)
            );
        }

        this.dom.notesList.innerHTML = '';
        filtered.forEach(note => {
            const div = document.createElement('div');
            div.className = `note-card ${this.currentNoteId === note.id ? 'active' : ''}`;
            div.innerHTML = `
                <h4>${note.title || '無題のノート'}</h4>
                <p>${note.content.substring(0, 60) || '内容なし...'}</p>
            `;
            div.onclick = () => this.openNote(note.id);
            this.dom.notesList.appendChild(div);
        });
    }

    renderTagsList() {
        const tags = new Set();
        this.notes.forEach(n => n.tags.forEach(t => tags.add(t)));

        this.dom.tagsList.innerHTML = '';
        
        // "All" pseudo-tag
        const allBtn = document.createElement('div');
        allBtn.className = `tag-item ${!this.selectedTag ? 'active' : ''}`;
        allBtn.textContent = 'すべて';
        allBtn.onclick = () => {
            this.selectedTag = null;
            this.render();
        };
        this.dom.tagsList.appendChild(allBtn);

        tags.forEach(tag => {
            const div = document.createElement('div');
            div.className = `tag-item ${this.selectedTag === tag ? 'active' : ''}`;
            div.textContent = tag;
            div.onclick = () => {
                this.selectedTag = (this.selectedTag === tag) ? null : tag;
                this.render();
            };
            this.dom.tagsList.appendChild(div);
        });
    }

    renderCurrentNoteTags(note) {
        this.dom.currentTags.innerHTML = '';
        note.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag-pill';
            span.innerHTML = `
                ${tag}
                <span class="tag-close">&times;</span>
            `;
            span.querySelector('.tag-close').onclick = (e) => {
                e.stopPropagation();
                this.removeTag(tag);
            };
            this.dom.currentTags.appendChild(span);
        });
    }

    showSaving() {
        this.dom.saveIndicator.textContent = '保存中...';
    }

    saveToStorage() {
        localStorage.setItem('quill_notes_v2', JSON.stringify(this.notes));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuillNotes();
});

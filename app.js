// Initialize Dexie.js (IndexedDB Multi-Project Storage Engine)
const db = new Dexie('SeetiCodeStudioDB');
db.version(1).stores({
  projects: 'name, html, css, js, py, updatedAt'
});

let currentProject = 'default';
let activeFile = 'index.html';
let pyodideInstance = null;

let files = {
  'index.html': '<!-- seeti code studio -->\n<div class="card">\n  <h1>Hello Seeti AI Studio</h1>\n  <button onclick="testLog()">Click Console Test</button>\n</div>',
  'styles.css': 'body { background: #0d1117; color: white; font-family: sans-serif; display: grid; place-content: center; height: 100vh; margin: 0; }\n.card { background: #161b22; padding: 20px; border-radius: 12px; border: 1px solid #30363d; text-align: center; }',
  'app.js': 'function testLog() {\n  console.log("Console message intercepted successfully!");\n  throw new Error("Sample runtime exception test!");\n}',
  'main.py': '# Python WebAssembly Offline Engine\ndef greet(name):\n    return f"Hello {name} from Pyodide WASM!"\n\nprint(greet("Seeti Studio User"))'
};

let editor;

// Load Saved Project Code & Initialize CodeMirror 6 Engine
async function initApp() {
  const savedProject = await db.projects.get(currentProject);
  if (savedProject) {
    files = { 
      'index.html': savedProject.html || '', 
      'styles.css': savedProject.css || '', 
      'app.js': savedProject.js || '',
      'main.py': savedProject.py || ''
    };
  } else {
    await saveCurrentProject();
  }

  editor = CodeMirror(document.getElementById('editorContainer'), {
    value: files[activeFile],
    mode: 'xml',
    theme: 'one-dark',
    lineNumbers: true,
    autoCloseBrackets: true,
    lineWrapping: true
  });

  editor.on('change', () => {
    files[activeFile] = editor.getValue();
  });

  editor.on('cursorActivity', () => {
    const pos = editor.getCursor();
    document.getElementById('cursorPos').innerText = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
  });

  renderDynamicSymbols();
}

// Context-Aware Dynamic Symbol Bar
const languageSymbols = {
  'index.html': ['<', '>', '/', '=', '"', 'div', 'class', 'id', 'script', 'style', 'Undo', 'Redo'],
  'styles.css': ['{', '}', ':', ';', '#', '.', 'px', 'rem', '%', 'margin', 'Undo', 'Redo'],
  'app.js': ['{', '}', '(', ')', ';', '=', '=>', 'const', 'let', 'function', 'console.log', 'Undo', 'Redo'],
  'main.py': ['def', ':', '(', ')', '=', 'import', 'print', 'for', 'in', 'return', 'Undo', 'Redo']
};

function renderDynamicSymbols() {
  const bar = document.getElementById('symbolBar');
  bar.innerHTML = '';
  const symbols = languageSymbols[activeFile] || languageSymbols['app.js'];

  symbols.forEach(sym => {
    const btn = document.createElement('button');
    btn.className = 'px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs rounded font-mono shrink-0';
    btn.innerText = sym;
    btn.onclick = () => {
      if (sym === 'Undo') editor.undo();
      else if (sym === 'Redo') editor.redo();
      else editor.replaceSelection(sym);
    };
    bar.appendChild(btn);
  });
}

// File Switcher with Engine Adjustments
document.querySelectorAll('.file-tab').forEach(tab => {
  tab.onclick = (e) => {
    document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active-tab'));
    const target = e.currentTarget;
    target.classList.add('active-tab');
    
    activeFile = target.getAttribute('data-file');
    editor.setValue(files[activeFile]);

    const modeMap = { 
      'index.html': 'xml', 
      'styles.css': 'css', 
      'app.js': 'javascript',
      'main.py': 'python' 
    };
    editor.setOption('mode', modeMap[activeFile]);
    document.getElementById('activeEngine').innerText = activeFile.endsWith('.py') ? 'Pyodide WASM Engine' : 'HTML/JS Engine';

    renderDynamicSymbols();
  };
});

// Run Code (Handles Web Preview & WASM Python Execution)
document.getElementById('runBtn').onclick = async () => {
  const previewFrame = document.getElementById('previewFrame');
  const terminalOutput = document.getElementById('terminalOutput');
  terminalOutput.innerHTML = '';

  document.getElementById('showPreviewBtn').click();

  if (activeFile === 'main.py') {
    terminalOutput.innerHTML = `<div class="text-purple-400 font-mono">> Initializing Pyodide WASM Engine...</div>`;
    try {
      if (!pyodideInstance) {
        pyodideInstance = await loadPyodide();
      }
      pyodideInstance.setStdout({
        batched: (str) => {
          terminalOutput.innerHTML += `<div class="text-green-400 font-mono">> ${str}</div>`;
        }
      });
      await pyodideInstance.runPythonAsync(files['main.py']);
    } catch (err) {
      terminalOutput.innerHTML += `<div class="text-red-400 font-mono">> WASM Python Error: ${err.message}</div>`;
    }
    return;
  }

  const consoleInterceptor = `
    <script>
      (function() {
        const sendLog = (type, msg) => {
          window.parent.postMessage({ type: 'TERMINAL_LOG', logType: type, text: msg }, '*');
        };
        console.log = (...args) => sendLog('log', args.join(' '));
        console.error = (...args) => sendLog('error', args.join(' '));
        window.onerror = (msg, url, line) => sendLog('error', 'Error [Line ' + line + ']: ' + msg);
      })();
    <\/script>
  `;

  const source = `
    <!DOCTYPE html>
    <html>
      <head><style>${files['styles.css']}</style></head>
      <body>
        ${files['index.html']}
        ${consoleInterceptor}
        <script>${files['app.js']}<\/script>
      </body>
    </html>
  `;

  previewFrame.srcdoc = source;
};

// Console Interceptor Listener
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TERMINAL_LOG') {
    const terminalOutput = document.getElementById('terminalOutput');
    const entry = document.createElement('div');
    entry.className = event.data.logType === 'error' ? 'text-red-400 font-mono' : 'text-green-400 font-mono';
    entry.innerText = `> ${event.data.text}`;
    terminalOutput.appendChild(entry);
  }
});

document.getElementById('clearTerminal').onclick = () => {
  document.getElementById('terminalOutput').innerHTML = '';
};

// Save Project Action
async function saveCurrentProject() {
  await db.projects.put({
    name: currentProject,
    html: files['index.html'],
    css: files['styles.css'],
    js: files['app.js'],
    py: files['main.py'],
    updatedAt: new Date()
  });
}
document.getElementById('saveBtn').onclick = async () => {
  await saveCurrentProject();
  alert(`Project '${currentProject}' saved to IndexedDB!`);
};

// Project Manager Modal Handlers
document.getElementById('projectsBtn').onclick = async () => {
  const modal = document.getElementById('projectModal');
  const list = document.getElementById('projectList');
  list.innerHTML = '';
  
  const allProjects = await db.projects.toArray();
  allProjects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 bg-[#0d1117] rounded border border-gray-800 text-xs';
    item.innerHTML = `
      <span class="font-medium ${p.name === currentProject ? 'text-purple-400' : 'text-gray-300'}">${p.name}</span>
      <div class="flex gap-2">
        <button class="text-blue-400 hover:underline" onclick="loadProject('${p.name}')">Load</button>
        ${p.name !== 'default' ? `<button class="text-red-400 hover:underline" onclick="deleteProject('${p.name}')">Delete</button>` : ''}
      </div>
    `;
    list.appendChild(item);
  });

  modal.classList.remove('hidden');
};

document.getElementById('closeProjectModal').onclick = () => {
  document.getElementById('projectModal').classList.add('hidden');
};

document.getElementById('createProjectBtn').onclick = async () => {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) return;
  currentProject = name;
  await saveCurrentProject();
  document.getElementById('newProjectName').value = '';
  document.getElementById('projectModal').classList.add('hidden');
  initApp();
};

window.loadProject = async (name) => {
  currentProject = name;
  await initApp();
  document.getElementById('projectModal').classList.add('hidden');
};

window.deleteProject = async (name) => {
  await db.projects.delete(name);
  document.getElementById('projectsBtn').click();
};

// QR Code Preview Share Modal
document.getElementById('qrBtn').onclick = () => {
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: window.location.href,
    width: 128,
    height: 128
  });
  document.getElementById('qrModal').classList.remove('hidden');
};
document.getElementById('closeQrModal').onclick = () => {
  document.getElementById('qrModal').classList.add('hidden');
};

// One-Click ZIP Export Engine
document.getElementById('exportZipBtn').onclick = () => {
  const zip = new JSZip();
  zip.file('index.html', files['index.html']);
  zip.file('styles.css', files['styles.css']);
  zip.file('app.js', files['app.js']);
  zip.file('main.py', files['main.py']);

  zip.generateAsync({ type: 'blob' }).then((content) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `${currentProject}-project.zip`;
    a.click();
  });
};

// Puter Dev AI Integration
document.getElementById('aiFixBtn').onclick = async () => {
  const btn = document.getElementById('aiFixBtn');
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fixing...`;
  try {
    const prompt = `Fix any errors or optimize this ${activeFile} code:\n${files[activeFile]}`;
    const response = await puter.ai.chat(prompt);
    if (response) {
      editor.setValue(response.toString());
      files[activeFile] = response.toString();
    }
  } catch (err) {
    alert('AI Fix Error: ' + err.message);
  } finally {
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span class="hidden sm:inline">AI Fix</span>`;
  }
};

// Navigation Switches
document.getElementById('showEditorBtn').onclick = () => {
  document.getElementById('editorContainer').classList.remove('hidden');
  document.getElementById('previewContainer').classList.add('hidden');
  document.getElementById('previewContainer').classList.remove('flex');
  document.getElementById('showEditorBtn').className = 'flex-1 py-1 text-center font-medium text-xs text-purple-400 border-b-2 border-purple-500';
  document.getElementById('showPreviewBtn').className = 'flex-1 py-1 text-center font-medium text-xs text-gray-400 hover:text-gray-200';
};

document.getElementById('showPreviewBtn').onclick = () => {
  document.getElementById('editorContainer').classList.add('hidden');
  document.getElementById('previewContainer').classList.remove('hidden');
  document.getElementById('previewContainer').classList.add('flex');
  document.getElementById('showPreviewBtn').className = 'flex-1 py-1 text-center font-medium text-xs text-purple-400 border-b-2 border-purple-500';
  document.getElementById('showEditorBtn').className = 'flex-1 py-1 text-center font-medium text-xs text-gray-400 hover:text-gray-200';
};

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('ServiceWorker Registered:', reg.scope))
      .catch((err) => console.error('ServiceWorker Error:', err));
  });
}

window.onload = initApp;

// --- DOM ELEMENTS ---
const editor = document.getElementById('codeEditor');
const webPreview = document.getElementById('webPreview');
const terminalOutput = document.getElementById('terminalOutput');
const langSelect = document.getElementById('langSelect');
const fileLabel = document.getElementById('fileLabel');
const statusLabel = document.getElementById('statusLabel');
const consoleModal = document.getElementById('consoleModal');
const projectList = document.getElementById('projectList');
const installPwaBtn = document.getElementById('installPwaBtn');

let deferredPrompt;

// --- STARTER TEMPLATES ---
const templates = {
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; text-align: center; background: #111; color: #fff; padding-top: 30px; }\n    button { padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }\n  </style>\n</head>\n<body>\n  <h1>Welcome to seeti code studio!</h1>\n  <button onclick="alert('Studio Engine Active!')">Test Application</button>\n</body>\n</html>`,
  python: `import sys\n\ndef main():\n    print("Hello from seeti code studio - Python Runtime!")\n\nif __name__ == "__main__":\n    main()`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "seeti code studio - C++ Engine Loaded!" << endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("seeti code studio - Java Runtime Active!");\n    }\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("seeti code studio - C Language Engine!\\n");\n    return 0;\n}`,
  php: `<?php\necho "seeti code studio - PHP Engine Active!";\n?>`,
  bash: `echo "seeti code studio - Shell Scripting!"`
};

// Initial template setup
editor.value = templates.html;

// --- EVENT LISTENERS ---
document.getElementById('langSelect').addEventListener('change', switchLanguage);
document.getElementById('runBtn').addEventListener('click', executeCode);
document.getElementById('saveBtn').addEventListener('click', saveProject);
document.getElementById('consoleBtn').addEventListener('click', () => toggleConsoleModal(true));
document.getElementById('closeModalBtn').addEventListener('click', () => toggleConsoleModal(false));
document.getElementById('aiFixBtn').addEventListener('click', askAI);
document.getElementById('clearOutputBtn').addEventListener('click', clearOutput);

// Mobile Symbol Bar handler
document.querySelectorAll('.sym-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const symbol = e.target.getAttribute('data-symbol');
    insertSymbol(symbol);
  });
});

// --- CORE IDE FUNCTIONS ---
function switchLanguage() {
  const lang = langSelect.value;
  fileLabel.innerText = lang === 'html' ? 'index.html' : `main.${getExt(lang)}`;
  
  if (templates[lang]) {
    editor.value = templates[lang];
  } else {
    editor.value = `// Write ${lang} code here...`;
  }

  if (lang === 'html') {
    webPreview.classList.remove('hidden');
    terminalOutput.classList.add('hidden');
  } else {
    webPreview.classList.add('hidden');
    terminalOutput.classList.remove('hidden');
    terminalOutput.innerText = `[seeti code studio]: Switched to ${lang.toUpperCase()}. Click 'Run' to execute.`;
  }
}

function getExt(lang) {
  const extMap = { python: 'py', cpp: 'cpp', c: 'c', java: 'java', php: 'php', bash: 'sh' };
  return extMap[lang] || lang;
}

function insertSymbol(symbol) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;

  if (symbol === 'Tab') {
    editor.value = text.substring(0, start) + '  ' + text.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
  } else {
    editor.value = text.substring(0, start) + symbol + text.substring(end);
    editor.selectionStart = editor.selectionEnd = start + symbol.length;
  }
  editor.focus();
}

async function executeCode() {
  const lang = langSelect.value;
  const code = editor.value;

  if (lang === 'html') {
    const blob = new Blob([code], { type: 'text/html' });
    webPreview.src = URL.createObjectURL(blob);
  } else {
    terminalOutput.innerText = "[seeti code studio]: Compiling & Executing code on sandbox...";
    
    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          version: "*",
          files: [{ content: code }]
        })
      });

      const data = await response.json();
      if (data.run) {
        terminalOutput.innerText = data.run.output || "> Program executed with no output.";
      } else {
        terminalOutput.innerText = "> Execution Error: Process failed.";
      }
    } catch (err) {
      terminalOutput.innerText = "> Network Error: Check internet connection. " + err.message;
    }
  }
}

// --- LOCAL STORAGE HISTORY CONSOLE ---
function saveProject() {
  const projectName = prompt("Project Name:", "My Studio Project");
  if (!projectName) return;

  const projectData = {
    id: Date.now(),
    name: projectName,
    lang: langSelect.value,
    code: editor.value,
    date: new Date().toLocaleString()
  };

  let projects = JSON.parse(localStorage.getItem('seeti_studio_projects')) || [];
  projects.push(projectData);
  localStorage.setItem('seeti_studio_projects', JSON.stringify(projects));
  alert(`"${projectName}" Saved to local history!`);
  renderConsole();
}

function renderConsole() {
  const projects = JSON.parse(localStorage.getItem('seeti_studio_projects')) || [];
  
  if (projects.length === 0) {
    projectList.innerHTML = `<p class="text-gray-500 text-xs text-center py-4">Koi saved project nahi mila.</p>`;
    return;
  }

  projectList.innerHTML = projects.map(p => `
    <div class="bg-gray-800 p-2.5 rounded border border-gray-700 flex justify-between items-center mb-2">
      <div>
        <h4 class="text-white text-xs font-semibold">${p.name} <span class="text-[10px] bg-indigo-900 text-indigo-300 px-1 rounded">${p.lang}</span></h4>
        <p class="text-[10px] text-gray-400">${p.date}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="loadProject(${p.id})" class="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded">Open</button>
        <button onclick="deleteProject(${p.id})" class="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

window.loadProject = function(id) {
  const projects = JSON.parse(localStorage.getItem('seeti_studio_projects')) || [];
  const project = projects.find(p => p.id === id);

  if (project) {
    langSelect.value = project.lang;
    editor.value = project.code;
    switchLanguage();
    toggleConsoleModal(false);
  }
};

window.deleteProject = function(id) {
  let projects = JSON.parse(localStorage.getItem('seeti_studio_projects')) || [];
  projects = projects.filter(p => p.id !== id);
  localStorage.setItem('seeti_studio_projects', JSON.stringify(projects));
  renderConsole();
};

function toggleConsoleModal(show) {
  if (show) {
    renderConsole();
    consoleModal.classList.remove('hidden');
  } else {
    consoleModal.classList.add('hidden');
  }
}

function askAI() {
  statusLabel.innerText = "AI Analyzing...";
  setTimeout(() => {
    alert("seeti code studio AI Hook Active!\nAap Gemini/OpenAI API connect karke direct code fix integration kar sakte hain.");
    statusLabel.innerText = "Ready";
  }, 600);
}

function clearOutput() {
  terminalOutput.innerText = "";
  webPreview.src = "about:blank";
}

// --- PWA INSTALLATION & SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('seeti code studio PWA Active!'))
      .catch(err => console.log('Service Worker Error:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPwaBtn.classList.remove('hidden');
});

installPwaBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installPwaBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  }
});
                                                       

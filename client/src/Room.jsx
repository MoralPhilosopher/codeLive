import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import io from 'socket.io-client';
import { oneDark } from '@codemirror/theme-one-dark';
import { useParams } from 'react-router-dom';
import './Room.css';

const socket = io('https://codelive-mtt1.onrender.com/');

export default function Room() {
  const { roomId } = useParams();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const langMap = {
    cpp: cpp(),
    python: python(),
    javascript: javascript()
  };

  useEffect(() => {
    socket.emit('join_room', roomId);
    socket.on('code_update', ({ room, newCode }) => {
      if (room === roomId) setCode(newCode);
    });
    return () => {
      socket.emit('leave_room', roomId);
      socket.off('code_update');
    };
  }, [roomId]);

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit('code_update', { room: roomId, newCode: value });
  };

  const runCode = async () => {
    const res = await fetch('http://localhost:5002/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, input }),
    });
    const data = await res.json();
    setOutput(data.output || "⚠️ No output returned from server.");
  };

  const downloadFile = () => {
    const extension = {
      cpp: 'cpp',
      python: 'py',
      javascript: 'js'
    }[language];
    const filename = `code-${roomId}.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className="leetcode-container">
      <div className="header">
        <div className="header-left">
          <h2>CodeLive</h2>
          <div className="room-id">Room: <code>{roomId}</code></div>
        </div>
        <div className="header-right">
          <button 
            onClick={copyRoomLink}
            className="toolbar-btn"
            title="Copy room link"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button 
            onClick={downloadFile}
            className="toolbar-btn"
            title="Download code"
          >
            Download
          </button>
          <select 
            onChange={(e) => setLanguage(e.target.value)} 
            value={language}
            className="language-select"
          >
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </div>

      <div className="main-content">
        <div className="editor-panel">
          <CodeMirror
            value={code}
            height="calc(100vh - 60px)"
            width="100%"
            theme={oneDark}
            extensions={[langMap[language]]}
            onChange={(val) => handleCodeChange(val)}
          />
        </div>

        <div className="io-panel">
          <div className="run-section">
            <button className="run-button" onClick={runCode}>
              Run
            </button>
          </div>
          <div className="input-section">
            <div className="section-header">Input</div>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              className="input-textarea"
              placeholder="Enter input here..."
            />
          </div>
          <div className="output-section">
            <div className="section-header">Output</div>
            <pre className="output-content">
              {output || "🕒 Your output will appear here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
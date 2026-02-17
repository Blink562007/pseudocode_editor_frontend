import { useEffect, useState } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import { validatePseudocode, type ValidationError, type ValidationWarning } from './api/pseudocodeApi'
import './App.css'

function App() {
  const [code, setCode] = useState('// Write your pseudocode here\n')
  const [output, setOutput] = useState<string[]>([])
  const [editorKey, setEditorKey] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const handleResize = () => setEditorKey(prev => prev + 1)
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleEditorWillMount = (monaco: Monaco) => {
    // Register custom pseudocode language
    monaco.languages.register({ id: 'pseudocode' })
    
    monaco.languages.setMonarchTokensProvider('pseudocode', {
      keywords: [
        'IF', 'THEN', 'ELSE', 'ENDIF', 'WHILE', 'FOR', 'ENDWHILE', 'ENDFOR',
        'FUNCTION', 'RETURN', 'OUTPUT', 'INPUT', 'SET', 'TO', 'DO',
        'REPEAT', 'UNTIL', 'CASE', 'OF', 'OTHERWISE', 'ENDCASE',
        'PROCEDURE', 'CALL', 'DECLARE', 'CONSTANT', 'NEXT', 'TYPE'
      ],
      types: [
        'INTEGER', 'STRING', 'BOOLEAN', 'REAL', 'CHAR', 'ARRAY', 'DATE', 'RECORD'
      ],
      constants: ['TRUE', 'FALSE', 'NULL'],
      operators: ['←', '=', '+', '-', '*', '/', '<', '>', '≤', '≥', '≠', 'AND', 'OR', 'NOT', 'MOD', 'DIV'],
      tokenizer: {
        root: [
          [/[A-Z]+/, {
            cases: {
              '@keywords': 'keyword',
              '@types': 'type',
              '@constants': 'constant',
              '@operators': 'operator',
              '@default': 'identifier'
            }
          }],
          [/[a-z_]\w*/, 'variable'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/\d+(\.\d+)?/, 'number'],
          [/\/\/.*$/, 'comment'],
          [/#.*$/, 'comment'],
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ]
      }
    })

    // Define theme colors
    monaco.editor.defineTheme('pseudocode-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'type', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'constant', foreground: '4FC1FF' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' }
      ],
      colors: {
        'editor.background': '#1E1E1E'
      }
    })
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOutput(['> Validating pseudocode...'])
    
    try {
      // Validate the code
      const validationResult = await validatePseudocode(code)
      
      if (!validationResult.isValid) {
        const errorMessages = ['> Validation Failed:', '']
        
        validationResult.errors.forEach((error: ValidationError) => {
          errorMessages.push(`Line ${error.lineNumber}: ${error.message}`)
        })
        
        if (validationResult.warnings.length > 0) {
          errorMessages.push('', '> Warnings:')
          validationResult.warnings.forEach((warning: ValidationWarning) => {
            errorMessages.push(`Line ${warning.lineNumber}: ${warning.message}`)
          })
        }
        
        setOutput(errorMessages)
        setIsRunning(false)
        return
      }

      // Show success with any warnings
      if (validationResult.warnings.length > 0) {
        const messages = ['> Validation passed with warnings:', '']
        validationResult.warnings.forEach((warning: ValidationWarning) => {
          messages.push(`Line ${warning.lineNumber}: ${warning.message}`)
        })
        setOutput(messages)
      } else {
        setOutput(['> Validation passed', '> No errors found'])
      }
    } catch (error) {
      setOutput([
        '> Error:',
        error instanceof Error ? error.message : 'Failed to validate code'
      ])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="header-panel">
        <h1>Pseudocode Editor</h1>
        <span className="header-subtitle">Cambridge-style pseudocode practice workspace</span>
      </header>

      <main className="workspace-grid">
        <aside className="sidebar-panel">
          <h2>Documents</h2>
          <ul className="sidebar-list">
            <li className="sidebar-item active">Untitled</li>
          </ul>
          <button className="sidebar-button" type="button">+ New Document</button>
        </aside>

        <section className="editor-panel">
          <div className="toolbar-panel">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="run-button"
              type="button"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>

          <div className="editor-surface">
            <Editor
              key={editorKey}
              height="100%"
              defaultLanguage="pseudocode"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="pseudocode-theme"
              beforeMount={handleEditorWillMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 }
              }}
            />
          </div>
        </section>
      </main>

      <section className="terminal-panel">
        <div className="terminal-header">Terminal</div>
        <div className="terminal-body">
          {output.length === 0 ? (
            <span className="terminal-placeholder">Terminal output will appear here...</span>
          ) : (
            output.map((line, index) => (
              <div
                key={index}
                className={line.includes('Error') || line.includes('error') ? 'terminal-line error' : 'terminal-line'}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default App

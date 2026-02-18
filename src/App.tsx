import { useEffect, useRef, useState } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import {
  createPseudocodeDocument,
  deletePseudocodeDocument,
  getPseudocodeDocumentById,
  getPseudocodeDocuments,
  updatePseudocodeDocument,
  validatePseudocode,
  type PseudocodeDocument,
  type ValidationError,
  type ValidationWarning
} from './api/pseudocodeApi'
import './App.css'

interface EditorDocument {
  id: string
  title: string
  content: string
  updatedAt?: string
  language?: string
  isLocal?: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function createDocumentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sortDocumentsByUpdatedAt(documents: EditorDocument[]): EditorDocument[] {
  return [...documents].sort((a, b) => {
    const first = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const second = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return second - first
  })
}

function App() {
  const [documents, setDocuments] = useState<EditorDocument[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [editorKey, setEditorKey] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [documentsLoadError, setDocumentsLoadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isOnline, setIsOnline] = useState(true)

  const saveStateTimeoutRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const autoSaveTimeoutRef = useRef<number | null>(null)
  const autoSaveStatusTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoadingDocuments(true)
      setDocumentsLoadError(null)

      try {
        const fetchedDocuments = await getPseudocodeDocuments()
        const normalizedDocuments = fetchedDocuments.map((document: PseudocodeDocument) => ({
          ...document,
          isLocal: false
        }))
        const sortedDocuments = sortDocumentsByUpdatedAt(normalizedDocuments)

        setDocuments(sortedDocuments)

        // Restore from localStorage if available
        const localStorageKey = 'pseudocode-autosave'
        const autoSavedDataRaw = localStorage.getItem(localStorageKey)

        if (autoSavedDataRaw) {
          try {
            const autoSavedData = JSON.parse(autoSavedDataRaw)
            
            if (autoSavedData && autoSavedData.documentId && autoSavedData.content) {
              const matchingDocument = sortedDocuments.find(doc => doc.id === autoSavedData.documentId)
              
              if (matchingDocument) {
                setSelectedDocumentId(autoSavedData.documentId)
                setCode(autoSavedData.content)
                setAutoSaveStatus('saved')
                
                setTimeout(() => {
                  setAutoSaveStatus('idle')
                }, 1500)
                
                return
              }
            }
          } catch (error) {
            // Invalid JSON, ignore
            localStorage.removeItem(localStorageKey)
          }
        }

        if (sortedDocuments.length > 0) {
          setSelectedDocumentId(sortedDocuments[0].id)
          setCode(sortedDocuments[0].content)
        } else {
          setSelectedDocumentId('')
          setCode('')
        }
      } catch (error) {
        setDocumentsLoadError(error instanceof Error ? error.message : 'Failed to load documents')
        showToast('Failed to load documents from server')
        setDocuments([])
        setSelectedDocumentId('')
        setCode('')
      } finally {
        setIsLoadingDocuments(false)
      }
    }

    void loadDocuments()
  }, [])

  useEffect(() => {
    const handleResize = () => setEditorKey(prev => prev + 1)
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleSaveHotkey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSaveDocument()
      }
    }

    window.addEventListener('keydown', handleSaveHotkey)
    return () => window.removeEventListener('keydown', handleSaveHotkey)
  })

  useEffect(() => {
    return () => {
      if (saveStateTimeoutRef.current !== null) {
        window.clearTimeout(saveStateTimeoutRef.current)
      }

      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current)
      }

      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
      }

      if (autoSaveStatusTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveStatusTimeoutRef.current)
      }
    }
  }, [])

  // Auto-save to localStorage every 2 seconds (debounced)
  useEffect(() => {
    if (!selectedDocumentId || !code) {
      return
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      const localStorageKey = 'pseudocode-autosave'
      const dataToSave = {
        documentId: selectedDocumentId,
        content: code,
        timestamp: new Date().toISOString()
      }

      localStorage.setItem(localStorageKey, JSON.stringify(dataToSave))
      
      setAutoSaveStatus('saving')
      
      if (autoSaveStatusTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveStatusTimeoutRef.current)
      }

      autoSaveStatusTimeoutRef.current = window.setTimeout(() => {
        setAutoSaveStatus('saved')

        autoSaveStatusTimeoutRef.current = window.setTimeout(() => {
          setAutoSaveStatus('idle')
        }, 1500)
      }, 300)
    }, 2000)
  }, [selectedDocumentId, code])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('Back online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      showToast('You are offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null
  const hasUnsavedChanges = selectedDocument !== null && code !== selectedDocument.content
  const selectedDocumentTitle = selectedDocument?.title ?? 'No Document Selected'

  const showToast = (message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    setToastMessage(message)
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 2200)
  }

  const setSavedIndicator = () => {
    setSaveState('saved')

    if (saveStateTimeoutRef.current !== null) {
      window.clearTimeout(saveStateTimeoutRef.current)
    }

    saveStateTimeoutRef.current = window.setTimeout(() => {
      setSaveState('idle')
    }, 1300)
  }

  const formatLastModified = (updatedAt?: string) => {
    if (!updatedAt) {
      return 'Last modified just now'
    }

    const parsedDate = new Date(updatedAt)
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Last modified unknown'
    }

    return `Last modified ${parsedDate.toLocaleString()}`
  }

  const handleSelectDocument = async (documentId: string) => {
    if (documentId === selectedDocumentId || renamingDocumentId === documentId) {
      return
    }

    if (hasUnsavedChanges) {
      const shouldDiscardChanges = window.confirm(
        'You have unsaved changes. Discard them and switch documents?'
      )

      if (!shouldDiscardChanges) {
        return
      }
    }

    const nextDocument = documents.find((document) => document.id === documentId)
    if (!nextDocument) {
      return
    }

    if (nextDocument.isLocal) {
      setSelectedDocumentId(documentId)
      setCode(nextDocument.content)
      return
    }

    try {
      const fullDocument = await getPseudocodeDocumentById(documentId)
      setSelectedDocumentId(documentId)
      setCode(fullDocument.content)

      setDocuments((previousDocuments) => previousDocuments.map((document) => (
        document.id === documentId
          ? {
            ...document,
            title: fullDocument.title,
            content: fullDocument.content,
            updatedAt: fullDocument.updatedAt,
            language: fullDocument.language,
            isLocal: false
          }
          : document
      )))
    } catch (error) {
      setOutput([
        '> Error:',
        error instanceof Error ? error.message : 'Failed to load selected document'
      ])
    }
  }

  const handleCreateNewDocument = () => {
    if (hasUnsavedChanges) {
      const shouldDiscardChanges = window.confirm(
        'You have unsaved changes. Create a new document anyway?'
      )

      if (!shouldDiscardChanges) {
        return
      }
    }

    const newDocument: EditorDocument = {
      id: createDocumentId(),
      title: 'Untitled',
      content: '',
      updatedAt: new Date().toISOString(),
      language: 'pseudocode',
      isLocal: true
    }

    setDocuments((previousDocuments) => [newDocument, ...previousDocuments])
    setSelectedDocumentId(newDocument.id)
    setCode('')
    setSaveState('idle')
  }

  const handleSaveDocument = async () => {
    setSaveState('saving')

    try {
      if (!selectedDocument) {
        const createdDocument = await createPseudocodeDocument({
          title: 'Untitled',
          content: code,
          language: 'pseudocode'
        })

        setCode(createdDocument.content)
        setSelectedDocumentId(createdDocument.id)
        setDocuments((previousDocuments) => sortDocumentsByUpdatedAt([
          {
            id: createdDocument.id,
            title: createdDocument.title,
            content: createdDocument.content,
            updatedAt: createdDocument.updatedAt,
            language: createdDocument.language,
            isLocal: false
          },
          ...previousDocuments
        ]))

        // Clear localStorage after successful save
        localStorage.removeItem('pseudocode-autosave')

        setSavedIndicator()
        return
      }

      const normalizedTitle = selectedDocument.title.trim() || 'Untitled'

      const payload = {
        title: normalizedTitle,
        content: code,
        language: selectedDocument.language ?? 'pseudocode'
      }

      const savedDocument = selectedDocument.isLocal
        ? await createPseudocodeDocument(payload)
        : await updatePseudocodeDocument(selectedDocument.id, payload)

      setCode(savedDocument.content)
      setSelectedDocumentId(savedDocument.id)

      setDocuments((previousDocuments) => {
        const mapped = previousDocuments.map((document) => {
          const matchId = selectedDocument.isLocal ? selectedDocument.id : savedDocument.id

          if (document.id !== matchId) {
            return document
          }

          return {
            id: savedDocument.id,
            title: savedDocument.title,
            content: savedDocument.content,
            updatedAt: savedDocument.updatedAt,
            language: savedDocument.language,
            isLocal: false
          }
        })

        return sortDocumentsByUpdatedAt(mapped)
      })

      // Clear localStorage after successful save
      localStorage.removeItem('pseudocode-autosave')

      setSavedIndicator()
    } catch (error) {
      setSaveState('error')
      const errorMessage = error instanceof Error ? error.message : 'Failed to save document'
      showToast(`Save failed: ${errorMessage}`)
      setOutput([
        '> Error:',
        errorMessage
      ])
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    const documentToDelete = documents.find((document) => document.id === documentId)
    if (!documentToDelete) {
      return
    }

    const shouldDelete = window.confirm(`Delete '${documentToDelete.title}'? This cannot be undone.`)
    if (!shouldDelete) {
      return
    }

    try {
      if (!documentToDelete.isLocal) {
        await deletePseudocodeDocument(documentId)
      }

      const remainingDocuments = documents.filter((document) => document.id !== documentId)
      const sortedRemaining = sortDocumentsByUpdatedAt(remainingDocuments)
      setDocuments(sortedRemaining)

      if (documentId === selectedDocumentId) {
        const nextDocument = sortedRemaining[0]

        if (nextDocument) {
          setSelectedDocumentId(nextDocument.id)
          setCode(nextDocument.content)
        } else {
          setSelectedDocumentId('')
          setCode('')
        }
      }

      showToast('Document deleted')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document'
      showToast(`Delete failed: ${errorMessage}`)
      setOutput([
        '> Error:',
        errorMessage
      ])
    }
  }

  const beginRenameDocument = (document: EditorDocument) => {
    setRenamingDocumentId(document.id)
    setRenameValue(document.title)
  }

  const cancelRenameDocument = () => {
    setRenamingDocumentId(null)
    setRenameValue('')
  }

  const commitRenameDocument = async (documentId: string) => {
    const documentToRename = documents.find((document) => document.id === documentId)
    if (!documentToRename) {
      cancelRenameDocument()
      return
    }

    const normalizedTitle = renameValue.trim() || 'Untitled'

    if (normalizedTitle === documentToRename.title) {
      cancelRenameDocument()
      return
    }

    setDocuments((previousDocuments) => previousDocuments.map((document) => (
      document.id === documentId ? { ...document, title: normalizedTitle } : document
    )))

    cancelRenameDocument()

    if (documentToRename.isLocal) {
      return
    }

    try {
      const updatedDocument = await updatePseudocodeDocument(documentId, {
        title: normalizedTitle,
        content: documentToRename.content,
        language: documentToRename.language ?? 'pseudocode'
      })

      setDocuments((previousDocuments) => sortDocumentsByUpdatedAt(previousDocuments.map((document) => (
        document.id === documentId
          ? {
            ...document,
            title: updatedDocument.title,
            content: updatedDocument.content,
            updatedAt: updatedDocument.updatedAt,
            language: updatedDocument.language,
            isLocal: false
          }
          : document
      ))))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename document'
      showToast(`Rename failed: ${errorMessage}`)
      setOutput([
        '> Error:',
        errorMessage
      ])
    }
  }

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate code'
      showToast(`Validation failed: ${errorMessage}`)
      setOutput([
        '> Error:',
        errorMessage
      ])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="app-shell">
      {!isOnline && (
        <div className="offline-banner" role="alert">
          ⚠️ You are offline. Changes will be saved locally only.
        </div>
      )}

      <header className="header-panel">
        <div className="header-title-wrap">
          <h1>{selectedDocumentTitle}{hasUnsavedChanges ? ' •' : ''}</h1>
          <span className="header-subtitle">Cambridge-style pseudocode practice workspace</span>
        </div>
      </header>

      <main className="workspace-grid">
        <aside className="sidebar-panel">
          <h2>Documents</h2>
          <ul className="sidebar-list">
            {isLoadingDocuments && <li className="sidebar-empty">Loading documents…</li>}

            {!isLoadingDocuments && documentsLoadError && (
              <li className="sidebar-empty">Failed to load documents: {documentsLoadError}</li>
            )}

            {!isLoadingDocuments && !documentsLoadError && documents.length === 0 && (
              <li className="sidebar-empty">No documents yet. Create one to get started.</li>
            )}

            {!isLoadingDocuments && !documentsLoadError && documents.map((document) => {
              const documentHasUnsavedChanges = document.id === selectedDocumentId && hasUnsavedChanges

              return (
                <li
                  key={document.id}
                  className={document.id === selectedDocumentId ? 'sidebar-item active' : 'sidebar-item'}
                  onClick={() => {
                    void handleSelectDocument(document.id)
                  }}
                >
                  <div className="sidebar-item-row">
                    {renamingDocumentId === document.id ? (
                      <input
                        className="rename-input"
                        value={renameValue}
                        autoFocus
                        onChange={(event) => setRenameValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => {
                          void commitRenameDocument(document.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void commitRenameDocument(document.id)
                          }

                          if (event.key === 'Escape') {
                            event.preventDefault()
                            cancelRenameDocument()
                          }
                        }}
                      />
                    ) : (
                      <button
                        className="sidebar-item-title"
                        type="button"
                        onDoubleClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          beginRenameDocument(document)
                        }}
                        title="Double-click to rename"
                      >
                        {document.title}{documentHasUnsavedChanges ? ' •' : ''}
                      </button>
                    )}

                    <button
                      className="delete-doc-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDeleteDocument(document.id)
                      }}
                      title="Delete document"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="sidebar-item-meta">{formatLastModified(document.updatedAt)}</div>
                </li>
              )
            })}
          </ul>
          <button className="sidebar-button" type="button" onClick={handleCreateNewDocument}>
            + New Document
          </button>
        </aside>

        <section className="editor-panel">
          <div className="toolbar-panel">
            <button
              onClick={() => {
                void handleSaveDocument()
              }}
              disabled={saveState === 'saving' || !isOnline}
              className="save-button"
              type="button"
            >
              {saveState === 'saving' ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="run-button"
              type="button"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>

            <span className={`save-status save-status-${saveState}`}>
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved ✓'}
              {saveState === 'error' && 'Save failed'}
              {saveState === 'idle' && (hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved')}
            </span>

            {autoSaveStatus !== 'idle' && (
              <span className={`autosave-status autosave-status-${autoSaveStatus}`}>
                {autoSaveStatus === 'saving' && 'Auto-saving locally...'}
                {autoSaveStatus === 'saved' && 'Auto-saved locally ✓'}
              </span>
            )}
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

      {toastMessage && (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default App

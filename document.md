When the user enters the website:
Display empty textbox for code to be written, a green run button at the bottom, and a empty terminal that will display errors

Given that the user has clicked on the code textbox
When the user enters text
Display text on the textbox/coding space.

Given that the user has clicked the run button
If the user has entered invalid code
Run the code and return the error in the terminal, highlight error in red, 

Given that the user has clicked the run button
If the user has entered valid code
Run the code and return the output of the code in the terminal.

Core Components:

1. UI/UX Architecture - Layout design with editor, run button, and terminal

App
├── Header (title, menu, theme toggle)
├── EditorPanel
│   ├── CodeEditor (Monaco/CodeMirror wrapper)
│   └── EditorToolbar (line count, language indicator)
├── ControlBar
│   ├── RunButton (green, prominent)
│   ├── ClearButton (reset editor)
│   └── StatusIndicator (running/idle/error)
└── TerminalPanel
    ├── TerminalHeader (clear output button)
    └── OutputDisplay (stdout, stderr rendering)

2. Code Editor - Monaco or CodeMirror integration with pseudocode support

Psuedocode Language Definition:

Keywords: IF, THEN, ELSE, WHILE, FOR, FUNCTION, RETURN, OUTPUT, INPUT
Operators: ←, =, +, -, *, /, AND, OR, NOT
Comments: // or #

3. Parser/Validator - Syntax validation for pseudocode

Lexical analysis (tokenization)
Syntax validation
Semantic checking (variable usage, scope)

Check balanced parentheses/brackets
Validate control structure syntax
Detect undefined variables
Type consistency checking
Proper indentation for block structures

4. Interpreter - Execution engine for running pseudocode

Abstract Syntax Tree (AST) generation from parsed code
Tree-walk interpreter pattern
Environment/scope management for variables

Supported Operations:

Variable declaration and assignment
Arithmetic operations (+, -, *, /, MOD)
Comparison operators (=, ≠, <, >, ≤, ≥)
Logical operators (AND, OR, NOT)
Control flow (IF/ELSE, WHILE, FOR loops)
Functions (declaration, calls, return values)
Arrays and data structures
INPUT/OUTPUT operations
Runtime Features:

Step-by-step execution (for future debug mode)
Execution timeout (prevent infinite loops)
Memory limit enforcement
Call stack tracking

5. Terminal Component - Output display with error highlighting

Separate stdout and stderr streams
ANSI color support (green for success, red for errors)
Timestamp for each output line
Auto-scroll to latest output
Maximum output buffer (prevent memory issues)

6. Run Button - Green button triggering the execution flow

User clicks Run
  ↓
Disable button, show loading state
  ↓
Clear previous output
  ↓
Tokenize → Parse → Validate
  ↓
If errors: Display in terminal (red), highlight error lines
  ↓
If valid: Execute AST
  ↓
Capture output/errors during execution
  ↓
Display results in terminal
  ↓
Re-enable button, show completion state

7. Error Handling - Red error highlighting and proper error messages

Error Categories:

Syntax Errors:

Missing keywords, invalid structure
Format: Line X: Syntax Error - Expected 'THEN' after IF condition
Runtime Errors:

Division by zero, array out of bounds
Format: Line X: Runtime Error - Division by zero
Semantic Errors:

Undefined variables, type mismatches
Format: Line X: Variable 'count' used before declaration

8. State Management - React state/context for managing application data

State Architecture (React Context + Hooks):

Persistence:

LocalStorage for code (auto-save every 2 seconds)
Session storage for output history
URL parameters for code sharing (base64 encoded)
Performance Optimization:

Debounce syntax checking (300ms after typing stops)
Memoize parser results
Virtual scrolling for large outputs
Web Workers for heavy parsing/execution

Polish & Launch:
Styling - Professional UI with proper color scheme
Enhancements - Code saving, examples, keyboard shortcuts
Testing - Comprehensive testing across scenarios
Deployment - Documentation and hosting setup
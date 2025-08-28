# Shadowverse

A communication application with voice, video, screen sharing, and text chat capabilities.

## Web Version

The web version of Shadowverse is built using HTML, CSS, and JavaScript in a single self-contained file.

### Features

- User authentication (sign in/up)
- Text messaging with real-time chat
- Voice and video calling simulation
- Screen sharing functionality
- Responsive UI design with dark theme

### Running the Web Version

1. Start the server:
   ```
   node server.js
   ```

2. Open your browser and navigate to `http://localhost:3001`

### Web UI Structure

The web application has three main sections:

1. **Authentication Section** - Sign in or create an account
2. **Text Chat Section** - Send and receive messages
3. **Voice/Video Call Section** - Control voice/video calls and screen sharing

## Desktop Version

A desktop version using Python is available with two implementations:

1. **PyQt5 Version** - Feature-rich desktop application with native widgets
2. **Tkinter Version** - Fallback version that uses Python's built-in GUI toolkit

### Features

- All the features of the web version
- Native desktop application experience
- Better performance for video calls
- Dark theme interface
- Tabbed interface for chat and calls

### Running the Desktop Version

```
python shadowverse_desktop.py
```

If you encounter issues with PyQt5, you can use the provided fix script:

```
fix_pyqt.bat
```

This script will:
1. Reinstall PyQt5 packages
2. Help you download and install the Microsoft Visual C++ Redistributable
3. Launch the application

If PyQt5 still doesn't work, the application will automatically offer to use the Tkinter fallback version.

### Troubleshooting PyQt5 Issues

If you see the error `ImportError: DLL load failed while importing QtWidgets`, it means there's an issue with your PyQt5 installation. Common solutions:

1. **Install Microsoft Visual C++ Redistributable**: 
   Download from https://aka.ms/vs/17/release/vc_redist.x64.exe

2. **Reinstall PyQt5**:
   ```
   pip uninstall -y PyQt5 PyQt5-Qt5 PyQt5-sip
   pip install --force-reinstall PyQt5
   ```

3. **Use the Tkinter Fallback**:
   When prompted, type 'y' to use the Tkinter version instead

## Project Structure

```
.
├── index.html              # Main HTML file with all web functionality
├── styles.css              # CSS styles (legacy, not used in current version)
├── server.js               # Node.js server
├── package.json            # Node.js dependencies
├── shadowverse_desktop.py  # Python desktop application
├── fix_pyqt.bat            # Script to fix PyQt5 issues
├── requirements.txt        # Python dependencies
├── favicon.png             # Application icon
└── README.md               # This file
```
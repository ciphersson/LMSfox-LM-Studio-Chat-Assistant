# Changelog

All notable changes to the LM Studio Firefox Extension will be documented in this file.

## [1.0.0] - 2025-08-18

### Added
- **Core Chat Interface**: ChatGPT-like popup interface (400x600px)
- **Full-Tab Interface**: Expanded chat with sidebar, history, and advanced features
- **LM Studio Integration**: Direct connection to local LM Studio server (localhost:1234)
- **Internet Search**: DuckDuckGo and Wikipedia search integration
- **Context Menu Integration**: Right-click options for selected text
- **Page Context Analysis**: Use current webpage content in conversations
- **Chat History**: Persistent conversation storage and session management
- **File Attachments**: Upload text files or paste content for analysis
- **Quick Prompts**: Pre-defined prompts for common tasks
- **Settings Page**: Comprehensive configuration options
- **Responsive Design**: Works on all screen sizes
- **Error Handling**: Robust error handling with user-friendly messages
- **Connection Status**: Real-time LM Studio connection monitoring
- **Model Selection**: Choose from available LM Studio models
- **Temperature Control**: Adjust AI response creativity
- **Export/Import**: Backup and restore conversations and settings
- **Floating Button**: Quick access button on web pages
- **Text Selection Actions**: Quick actions when selecting text
- **Theme Support**: Dark theme with light theme planned
- **Privacy Controls**: Local storage with optional analytics

### Technical Features
- **Manifest v2**: Firefox-compatible extension format
- **Background Script**: Handles context menus and web search
- **Content Script**: Page injection for enhanced functionality
- **Storage API**: Persistent settings and chat history
- **Fetch API**: LM Studio communication with timeout handling
- **SVG Icons**: Scalable vector icons for all sizes
- **CSS Grid/Flexbox**: Modern responsive layouts
- **Vanilla JavaScript**: No framework dependencies for performance

### Developer Tools
- **Build Script**: Automated packaging and optimization
- **Test Suite**: Comprehensive functionality testing
- **Installation Script**: Windows batch file for easy setup
- **Package.json**: NPM scripts for development workflow
- **Documentation**: Comprehensive README and quick start guide

### Security & Privacy
- **Local Processing**: All AI processing happens locally via LM Studio
- **Minimal Permissions**: Only necessary browser permissions requested
- **No External Servers**: Except for search APIs (DuckDuckGo, Wikipedia)
- **Data Encryption**: Browser storage encryption for chat history
- **Optional Analytics**: User-controlled usage data collection

### Known Limitations
- Requires LM Studio to be running locally
- Search limited to DuckDuckGo and Wikipedia APIs
- Temporary extension installation (manual process)
- No streaming responses (planned for future release)
- Limited to text-based interactions

### Browser Compatibility
- **Firefox**: Version 88+ (Manifest v2)
- **Chrome**: Not yet supported (Manifest v3 planned)
- **Edge**: Not yet supported
- **Safari**: Not planned

### System Requirements
- **OS**: Windows, macOS, Linux
- **RAM**: 8GB+ recommended (for LM Studio)
- **Storage**: 50MB for extension, 4GB+ for AI models
- **Network**: Internet connection for search features

---

## Planned Features (Future Releases)

### Version 1.1.0
- [ ] Streaming responses for real-time chat
- [ ] Voice input and output
- [ ] Image analysis support
- [ ] Custom prompt templates
- [ ] Keyboard shortcuts

### Version 1.2.0
- [ ] Chrome extension (Manifest v3)
- [ ] Light theme support
- [ ] Advanced search providers
- [ ] Conversation sharing
- [ ] Plugin system

### Version 2.0.0
- [ ] Multi-model support
- [ ] Cloud sync (optional)
- [ ] Team collaboration features
- [ ] Advanced analytics
- [ ] Mobile companion app

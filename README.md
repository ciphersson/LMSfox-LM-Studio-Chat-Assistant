# 🤖 LMSfox - LM Studio Chat Assistant - Firefox Extension

A powerful Firefox extension that provides a ChatGPT-like interface for LM Studio with **full browser control** and internet search capabilities.

## ✨ Features

### 🎯 Core Functionality

- **Real-time Chat Interface** - Clean, modern UI similar to ChatGPT
- **LM Studio Integration** - Direct connection to your local LM Studio server
- **🔥 Smart Internet Bridge** - Automatically gives ANY model internet search capabilities
- **🌐 Full Browser Control** - Complete automation and monitoring capabilities
- **Context Menu Integration** - Right-click to ask about selected text
- **🤖 AI-Powered Content Analysis** - Auto-analyze web pages with intelligent summaries
- **📚 Academic Citation Generator** - Generate proper citations in multiple formats
- **🔍 Fact-Checking System** - Verify claims with source validation
- **📝 Research Note Organization** - AI-tagged note management system

### 🚀 Browser Automation & Control

- **🤖 Intelligent Page Interaction** - Automatic form filling, clicking, and navigation
- **📊 Real-time Data Extraction** - Extract structured data from any webpage
- **🔍 Element Highlighting** - Visual page analysis and element identification
- **📝 Form Automation** - Smart form detection and auto-completion
- **🌐 Tab Management** - Control multiple tabs and browser windows
- **📈 Activity Monitoring** - Track user interactions and page changes
- **🔄 Task Automation** - Record and replay complex browser workflows
- **💾 Session Management** - Save and restore browsing sessions
- **🎯 Smart Context Menus** - Enhanced right-click options for automation

### 🔍 Smart Internet Bridge (work in progress)

- **🤖 Universal Model Enhancement** - Any LM Studio model gets internet capabilities
- **🧠 Automatic Search Detection** - Intelligently detects queries needing current info
- **⚡ Real-time Web Data** - DuckDuckGo and Wikipedia integration
- **🎯 Context-Aware Results** - Search results formatted for AI understanding
- **🔄 Seamless Integration** - Works with popup, full chat, and context menus

### 🤖 Advanced Agentic Features (work in progress)

- **📊 Scheduled Automation Tasks** - Create recurring browser automation workflows
- **🔗 Multi-Site Data Collection** - Systematic data gathering from multiple sources
- **🔍 Cross-Reference Analysis** - Compare and validate information across websites
- **✅ AI-Powered Fact-Checking** - Verify claims with intelligent source validation
- **📝 Research Note Management** - Organize notes with AI tagging and categorization
- **📚 Academic Citation Generator** - Generate proper citations in APA, MLA, Chicago, Harvard, IEEE, Vancouver
- **🤖 Content Analysis Engine** - Auto-analyze web pages with AI summaries and insights
- **💡 Key Insight Extraction** - Pull important points and actionable takeaways from content
- **🎯 Smart Content Highlighting** - Automatically identify and highlight important sections

#### Auto-Search Triggers
- **Current Events**: "latest news", "recent updates", "today's weather"
- **Factual Queries**: "Bitcoin price", "who won the election", "current version"
- **Technology**: "Python 3.12 release", "React updates", "GitHub repos"
- **Comparisons**: "iPhone vs Samsung", "difference between X and Y"
- **Time-Sensitive**: "what happened this week", "2025 events"

### 💬 Chat Features

- **Chat History** - Persistent conversation storage
- **Multiple Sessions** - Organize conversations by topic
- **Quick Prompts** - Pre-defined prompts for common tasks
- **File Attachments** - Upload text files or paste content
- **Export/Import** - Backup your conversations

### 🎨 User Interface

- **Popup Interface** - Quick access from toolbar (400x600px)
- **Full-Tab Interface** - Expanded chat with sidebar and history
- **Floating Button** - Quick access button on web pages
- **Text Selection Actions** - Quick actions when selecting text
- **Responsive Design** - Works on all screen sizes

### ⚙️ Customization

- **Model Selection** - Choose from available LM Studio models
- **Temperature Control** - Adjust response creativity
- **Search Settings** - Configure search behavior
- **Theme Options** - Dark/Light/Auto themes
- **Privacy Controls** - Manage data storage and analytics

## 🚀 How the Internet Bridge Works

The extension transforms any LM Studio model into an **internet-enhanced AI assistant**:

### 🔄 Automatic Process
1. **Query Analysis** - Detects if your question needs current information (work in progress)
2. **Smart Search** - Searches DuckDuckGo and Wikipedia for relevant data  (work in progress. Kinda working... sometimes)
3. **Context Enhancement** - Formats results for optimal AI understanding
4. **Model Integration** - Injects enhanced context into your chosen model (work in progress)
5. **Unified Response** - Combines current web data with AI knowledge (work in progress)

### 💡 Example Scenarios

**Auto-Search Activated:**
- *"What's Bitcoin's price today?"* → 🔍 Searches → 🤖 Model gets current price data
- *"Latest React updates"* → 🔍 Searches → 🤖 Model gets current version info
- *"Who won the 2024 election?"* → 🔍 Searches → 🤖 Model gets recent results

**Model Knowledge Only:**
- *"Explain quantum computing"* → 🤖 Uses training knowledge directly
- *"Write a poem about cats"* → 🤖 Pure creative AI response
- *"How does photosynthesis work?"* → 🤖 Uses scientific knowledge

### 🎯 Visual Indicators
- **🔵 Blue Button**: Manual search enabled
- **🟢 Green Pulsing**: Auto-search activated for current query
- **Loading Messages**: Shows "internet-enhanced" vs "local" processing

## 🚀 Installation

### Prerequisites
1. **LM Studio** - Download and install from [lmstudio.ai](https://lmstudio.ai)
2. **Firefox** - Version 88 or higher
3. **Local Server** - LM Studio running on `localhost:1234`

### Setup LM Studio
1. Download and install LM Studio
2. Download a model (e.g., Llama 2, Code Llama, Mistral) works well with GEMA.
3. Start the local server:
   - Go to "Local Server" tab
   - Click "Start Server"
   - Ensure it's running on port 1234

### Install Extension

#### Method 1: Developer Mode (Recommended)
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select `manifest.json`

#### Method 2: Package and Install
1. Zip the entire extension folder
2. Rename the zip file to `.xpi`
3. Drag and drop the `.xpi` file into Firefox

## 🔧 Configuration

### Initial Setup
1. Click the extension icon in the toolbar
2. The extension will automatically try to connect to LM Studio
3. If connection fails, check that LM Studio server is running
4. Go to Settings (⚙️) to configure advanced options

### API Settings
- **Default URL**: `http://localhost:1234/v1`
- **Timeout**: 10 seconds (depending on vid card might wanna play with this or you get timeouts) 
- **Models**: Auto-detected from LM Studio

### Search Configuration
- Enable/disable internet search
- Configure number of search results
- Include Wikipedia results (works. See timeouts)
- Search result integration (work in progress)

## 📖 Usage Guide

### Basic Chat
1. Click the extension icon to open the popup
2. Type your message in the input field
3. Press Enter or click Send (➤)
4. Toggle 🔍 to enable internet search

### Context Menu
1. Select text on any webpage
2. Right-click and choose:
   - "Ask LM Studio about this"
   - "Explain this code with LM Studio"
   - "Summarize this page with LM Studio"

### Full Interface
1. Click the 🔗 button in popup to open full interface
2. Use sidebar for chat history and quick prompts
3. Enable page context to include current webpage
4. Attach files or paste content for analysis

### Quick Actions
1. Select text on any webpage
2. Quick action buttons appear automatically
3. Choose from Ask, Explain, or Search options

## 🛠️ Development

### Project Structure

```text
lm-studio-firefox-extension/
├── manifest.json                    # Extension configuration
├── popup.html                      # Popup interface
├── chat.html                       # Full-tab interface
├── options.html                    # Settings page
├── fact-check-ui.html              # Fact-checking interface
├── research-notes-ui.html          # Research notes interface
├── citation-ui.html                # Citation generator interface
├── content-analysis-ui.html        # Content analysis interface
├── data-collection-ui.html         # Data collection interface
├── cross-reference-ui.html         # Cross-reference interface
├── scripts/                        # JavaScript files
│   ├── background.js               # Background script with full browser control
│   ├── content.js                  # Content script
│   ├── popup.js                    # Popup interface logic
│   ├── chat.js                     # Full chat interface logic
│   ├── automation-system.js        # Scheduled automation tasks
│   ├── data-collection-system.js   # Multi-site data collection
│   ├── cross-reference-system.js   # Cross-reference analysis
│   ├── fact-check-system.js        # Fact-checking with AI
│   ├── research-notes-system.js    # AI-tagged research notes
│   ├── citation-generator.js       # Academic citation generation
│   ├── content-analyzer.js         # AI content analysis engine
│   ├── fact-check-ui.js            # Fact-checking UI controller
│   ├── research-notes-ui.js        # Research notes UI controller
│   ├── citation-ui.js              # Citation UI controller
│   └── content-analysis-ui.js      # Content analysis UI controller
├── styles/                         # CSS files
│   ├── popup.css                   # Popup interface styles
│   ├── chat.css                    # Chat interface styles
│   ├── content.css                 # Content script styles
│   ├── fact-check-ui.css           # Fact-checking UI styles
│   ├── research-notes-ui.css       # Research notes UI styles
│   ├── citation-ui.css             # Citation UI styles
│   └── content-analysis-ui.css     # Content analysis UI styles
├── icons/                          # Extension icons
└── README.md                       # Documentation
```

### Building
1. Clone or download the project
2. Make modifications as needed
3. Test in Firefox developer mode
4. Package as `.xpi` for distribution

### API Integration
The extension uses the LM Studio OpenAI-compatible API:
- **Endpoint**: `/v1/chat/completions`
- **Models**: `/v1/models`
- **Format**: OpenAI ChatML format

## 🔒 Privacy & Security

- All data stored locally in Firefox
- No external servers except for search APIs
- Chat history encrypted in browser storage
- Optional analytics (disabled by default)
- Full browser control with user consent

### 🔐 Enhanced Permissions

- **`tabs`** - Full tab management and control
- **`activeTab`** - Access current tab for context
- **`storage`** - Save settings and chat history
- **`contextMenus`** - Right-click integration
- **`bookmarks`** - Bookmark management and analysis
- **`history`** - Browse history monitoring
- **`downloads`** - Download tracking and management
- **`cookies`** - Cookie access for session management
- **`webNavigation`** - Navigation event monitoring
- **`webRequest`** - Network request interception
- **`webRequestBlocking`** - Request modification capabilities
- **`proxy`** - Proxy configuration control
- **`privacy`** - Privacy settings management
- **`management`** - Extension management
- **`topSites`** - Most visited sites access
- **`sessions`** - Session management
- **`notifications`** - System notifications
- **`clipboardRead/Write`** - Clipboard access
- **`geolocation`** - Location services
- **`<all_urls>`** - Universal website access

### Search APIs

- DuckDuckGo Instant Answer API (public)
- Wikipedia REST API (public)
- No personal data sent to search providers

## 🐛 Troubleshooting

### Connection Issues
- **"Disconnected"**: Check LM Studio server is running
- **"No models"**: Load a model in LM Studio
- **"Connection timeout"**: Increase timeout in settings
- **"CORS errors"**: Ensure LM Studio allows local connections

### Performance
- **Slow responses**: Check model size and hardware
- **Memory issues**: Reduce max tokens in settings
- **Search timeout**: Disable search or increase timeout

### Common Problems
1. **Extension not loading**: Check Firefox version compatibility
2. **No context menu**: Enable in extension settings
3. **Search not working**: Check internet connection
4. **History not saving**: Check storage permissions

## 📝 Changelog

### Version 0.0.2 Planned - Advanced Agentic Features

- **🤖 Content Analysis Engine** - AI-powered webpage analysis with summaries, key points, and insights
- **📚 Academic Citation Generator** - Multi-format citation generation (APA, MLA, Chicago, Harvard, IEEE, Vancouver)
- **🔍 Fact-Checking System** - Intelligent claim verification with source validation
- **📝 Research Note Organization** - AI-tagged note management with categorization
- **📊 Scheduled Automation Tasks** - Recurring browser automation workflows
- **🔗 Multi-Site Data Collection** - Systematic data gathering pipelines
- **🔍 Cross-Reference Analysis** - Information validation across multiple sources
- **💡 Key Insight Extraction** - Automated extraction of important points and takeaways
- **🎯 Smart Content Highlighting** - Intelligent identification of important sections

### Version 0.0.1 - Core Foundation

- **🚀 Initial Release** - Core LM Studio integration
- **💬 Chat Interface** - Clean popup and full-tab interfaces  
- **🔍 Internet Search Bridge** - Wikipedia and DuckDuckGo integration
- **🤖 Auto-Search Detection** - Intelligent query analysis (work in progress)
- **🌐 Full Browser Control** - Complete automation capabilities (work in progress)
- **📊 Data Extraction** - Structured webpage data collection (work in progress)
- **🎯 Context Menus** - Enhanced right-click automation options (work in progress)
- **⚙️ Settings Management** - Configurable API and search settings
- **🔒 Enhanced Permissions** - Full browser access and control
- **📝 Form Automation** - Smart form filling and interaction (work in progress)
- **📈 Activity Monitoring** - Real-time browser event tracking (work in progress)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

## 🙏 Acknowledgments

- **LM Studio Team** - For the excellent local AI platform
- **OpenAI** - For the API standard
- **Firefox** - For the extension platform
- **DuckDuckGo** - For search API access

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review LM Studio documentation
3. Check Firefox extension development guides
4. Hit me up on discord

---

**Made with ❤️ for my fellow geeks**

CiphersSon 
